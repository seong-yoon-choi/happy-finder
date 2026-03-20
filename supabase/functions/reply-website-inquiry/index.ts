import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const WEBSITE_INQUIRIES_TABLE = 'website_inquiries';
const DEFAULT_ADMIN_EMAILS = ['sychoi04180605@gmail.com'];

const jsonResponse = (status: number, payload: Record<string, unknown>) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
};

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const getAdminEmails = () => {
  const rawValue = Deno.env.get('SUPPORT_ADMIN_EMAILS') || '';
  const configuredEmails = rawValue
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  return configuredEmails.length > 0 ? configuredEmails : DEFAULT_ADMIN_EMAILS;
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const extractEmailAddress = (value: string) => {
  const matchedEmail = value.match(/<([^>]+)>/);

  if (matchedEmail?.[1]) {
    return matchedEmail[1].trim();
  }

  return value.trim();
};

const createEmailHtml = ({
  replyMessage,
  inquirySubject,
  inquiryMessage
}: {
  replyMessage: string,
  inquirySubject: string,
  inquiryMessage: string
}) => {
  const safeReplyMessage = escapeHtml(replyMessage).replaceAll('\n', '<br />');
  const safeInquirySubject = escapeHtml(inquirySubject || '제목 없음');
  const safeInquiryMessage = escapeHtml(inquiryMessage || '').replaceAll('\n', '<br />');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #1f2937;">
      <p>안녕하세요.</p>
      <p>Happy Finder 문의에 대한 답변을 보내드립니다.</p>
      <div style="margin: 20px 0; padding: 16px; border-radius: 16px; background: #fff7f6; border: 1px solid #ffd5d0;">
        <strong style="display: block; margin-bottom: 10px;">답변 내용</strong>
        <div>${safeReplyMessage}</div>
      </div>
      <div style="margin: 20px 0; padding: 16px; border-radius: 16px; background: #ffffff; border: 1px solid #f1d0cc;">
        <strong style="display: block; margin-bottom: 10px;">문의 제목</strong>
        <div>${safeInquirySubject}</div>
        <strong style="display: block; margin: 16px 0 10px;">문의 내용</strong>
        <div>${safeInquiryMessage || '-'}</div>
      </div>
      <p>감사합니다.<br />Happy Finder</p>
    </div>
  `.trim();
};

const sendReplyEmail = async ({
  apiKey,
  from,
  replyTo,
  to,
  subject,
  html,
  text
}: {
  apiKey: string,
  from: string,
  replyTo: string,
  to: string,
  subject: string,
  html: string,
  text: string
}) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo ? [replyTo] : undefined,
      subject,
      html,
      text
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('reply-website-inquiry email failed', payload);
    throw new Error('email_send_failed');
  }

  return typeof payload?.id === 'string' ? payload.id : null;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const supportEmailFrom = Deno.env.get('SUPPORT_EMAIL_FROM');
  const supportReplyTo = extractEmailAddress(Deno.env.get('SUPPORT_REPLY_TO') || supportEmailFrom || '');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !resendApiKey || !supportEmailFrom) {
    return jsonResponse(500, { error: 'server_not_configured' });
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return jsonResponse(401, { error: 'missing_authorization' });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    },
    auth: {
      persistSession: false
    }
  });

  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: 'invalid_user' });
  }

  const userEmail = normalizeText(user.email).toLowerCase();

  if (!getAdminEmails().includes(userEmail)) {
    return jsonResponse(403, { error: 'forbidden' });
  }

  const requestPayload = await req.json().catch(() => ({}));
  const inquiryId = normalizeText(requestPayload?.inquiryId);
  const replyMessage = normalizeText(requestPayload?.replyMessage);

  if (!inquiryId || !replyMessage) {
    return jsonResponse(400, { error: 'invalid_reply' });
  }

  if (replyMessage.length > 5000) {
    return jsonResponse(400, { error: 'reply_too_long' });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data: inquiry, error: inquiryError } = await adminClient
    .from(WEBSITE_INQUIRIES_TABLE)
    .select('*')
    .eq('id', inquiryId)
    .single();

  if (inquiryError || !inquiry) {
    return jsonResponse(404, { error: 'inquiry_not_found' });
  }

  const inquiryEmail = normalizeText(inquiry.email).toLowerCase();

  if (!inquiryEmail) {
    return jsonResponse(400, { error: 'missing_recipient_email' });
  }

  const inquirySubject = normalizeText(inquiry.subject) || '문의에 대한 답변';
  const inquiryMessage = normalizeText(inquiry.message);
  const emailSubject = `[Happy Finder 답변] ${inquirySubject}`;
  const emailHtml = createEmailHtml({
    replyMessage,
    inquirySubject,
    inquiryMessage
  });
  const emailText = [
    '안녕하세요.',
    'Happy Finder 문의에 대한 답변을 보내드립니다.',
    '',
    '[답변 내용]',
    replyMessage,
    '',
    '[문의 제목]',
    inquirySubject,
    '',
    '[문의 내용]',
    inquiryMessage || '-',
    '',
    '감사합니다.',
    'Happy Finder'
  ].join('\n');

  let replyEmailId: string | null = null;

  try {
    replyEmailId = await sendReplyEmail({
      apiKey: resendApiKey,
      from: supportEmailFrom,
      replyTo: supportReplyTo,
      to: inquiryEmail,
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    });
  } catch (error) {
    return jsonResponse(502, { error: 'email_send_failed' });
  }

  const { data: updatedInquiry, error: updateError } = await adminClient
    .from(WEBSITE_INQUIRIES_TABLE)
    .update({
      admin_reply: replyMessage,
      replied_at: new Date().toISOString(),
      replied_by_email: userEmail || null,
      reply_email_id: replyEmailId
    })
    .eq('id', inquiryId)
    .select('*')
    .single();

  if (updateError || !updatedInquiry) {
    console.error('reply-website-inquiry update failed', updateError);
    return jsonResponse(500, { error: 'reply_save_failed' });
  }

  return jsonResponse(200, {
    success: true,
    inquiry: updatedInquiry
  });
});
