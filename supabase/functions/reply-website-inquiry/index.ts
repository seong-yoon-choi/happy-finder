import nodemailer from 'npm:nodemailer@7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const WEBSITE_INQUIRIES_TABLE = 'website_inquiries';
const DEFAULT_ADMIN_EMAILS = ['sychoi04180605@gmail.com'];
const DEFAULT_EMAIL_SEND_ERROR = 'email_send_failed';
const DEFAULT_RESEND_FROM = 'Happy Finder <onboarding@resend.dev>';
const DEFAULT_SMTP_HOST = 'smtp.resend.com';
const DEFAULT_SMTP_PORT = 465;
const DEFAULT_SMTP_USERNAME = 'resend';

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

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const formatSmtpError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return DEFAULT_EMAIL_SEND_ERROR;
  }

  const smtpError = error as Error & {
    code?: string,
    response?: string,
    responseCode?: number,
    command?: string
  };

  const details = [
    smtpError.code,
    typeof smtpError.responseCode === 'number' ? String(smtpError.responseCode) : '',
    smtpError.command,
    smtpError.response,
    smtpError.message
  ].filter(Boolean);

  return details.join(' | ') || DEFAULT_EMAIL_SEND_ERROR;
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
  host,
  port,
  secure,
  username,
  password,
  from,
  replyTo,
  to,
  subject,
  html,
  text
}: {
  host: string,
  port: number,
  secure: boolean,
  username: string,
  password: string,
  from: string,
  replyTo: string,
  to: string,
  subject: string,
  html: string,
  text: string
}) => {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: username,
      pass: password
    }
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: replyTo || undefined,
      subject,
      html,
      text
    });

    return typeof info?.messageId === 'string' ? info.messageId : null;
  } catch (error) {
    console.error('reply-website-inquiry smtp failed', error);
    throw new Error(formatSmtpError(error));
  } finally {
    transporter.close();
  }
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const smtpHost = Deno.env.get('SMTP_HOST') || DEFAULT_SMTP_HOST;
  const smtpPort = parsePort(Deno.env.get('SMTP_PORT'), DEFAULT_SMTP_PORT);
  const smtpSecure = parseBoolean(Deno.env.get('SMTP_SECURE'), smtpPort === 465);
  const smtpUsername = Deno.env.get('SMTP_USERNAME')
    || Deno.env.get('SMTP_USER')
    || DEFAULT_SMTP_USERNAME;
  const smtpPassword = Deno.env.get('SMTP_PASSWORD')
    || Deno.env.get('SMTP_PASS')
    || Deno.env.get('RESEND_API_KEY');
  const supportEmailFrom = Deno.env.get('SUPPORT_EMAIL_FROM')
    || Deno.env.get('RESEND_FROM_EMAIL')
    || Deno.env.get('RESEND_FROM')
    || DEFAULT_RESEND_FROM;
  const supportReplyTo = extractEmailAddress(
    Deno.env.get('SUPPORT_REPLY_TO')
    || Deno.env.get('RESEND_REPLY_TO')
    || Deno.env.get('SUPPORT_CONTACT_EMAIL')
    || supportEmailFrom
    || ''
  );

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !smtpPassword) {
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
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      username: smtpUsername,
      password: smtpPassword,
      from: supportEmailFrom,
      replyTo: supportReplyTo,
      to: inquiryEmail,
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    });
  } catch (error) {
    const errorMessage = error instanceof Error && error.message
      ? error.message
      : DEFAULT_EMAIL_SEND_ERROR;
    return jsonResponse(502, { error: errorMessage });
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
