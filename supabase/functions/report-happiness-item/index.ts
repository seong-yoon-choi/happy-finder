import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const OTHER_REPORT_REASON_CODE = 'other';
const REPORT_REASON_CODES = new Set([
  'sexual_content',
  'violent_content',
  'hate_or_harassment',
  'spam_or_advertising',
  'dangerous_behavior',
  OTHER_REPORT_REASON_CODE
]);

const jsonResponse = (status: number, payload: Record<string, unknown>) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
};

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(500, { success: false, code: 'SERVER_NOT_CONFIGURED' });
  }

  const payload = await req.json().catch(() => ({}));
  const itemId = normalizeString(payload?.itemId);
  const reasonCodes = Array.isArray(payload?.reasonCodes)
    ? Array.from(new Set(
      payload.reasonCodes
        .map((code: unknown) => normalizeString(code))
        .filter((code: string) => REPORT_REASON_CODES.has(code))
    ))
    : [];
  const otherReason = normalizeString(payload?.otherReason).slice(0, 500);

  if (!itemId) {
    return jsonResponse(200, { success: false, code: 'INVALID_ITEM' });
  }

  if (reasonCodes.length === 0) {
    return jsonResponse(200, { success: false, code: 'REASONS_REQUIRED' });
  }

  if (reasonCodes.includes(OTHER_REPORT_REASON_CODE) && !otherReason) {
    return jsonResponse(200, { success: false, code: 'OTHER_REASON_REQUIRED' });
  }

  let reporterUserId: string | null = null;
  const authHeader = req.headers.get('Authorization');

  if (authHeader) {
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
      data: { user }
    } = await userClient.auth.getUser();

    reporterUserId = user?.id ?? null;
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data: item, error: itemError } = await adminClient
    .from('happiness_items')
    .select('id, title, description, owner_user_id, is_active')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    console.error('report-happiness-item lookup failed', itemError);
    return jsonResponse(500, { success: false, code: 'LOOKUP_FAILED' });
  }

  if (!item || item.is_active !== true) {
    return jsonResponse(200, { success: false, code: 'ITEM_NOT_FOUND' });
  }

  if (reporterUserId) {
    const { data: existingReport } = await adminClient
      .from('happiness_item_reports')
      .select('id')
      .eq('item_id', itemId)
      .eq('reporter_user_id', reporterUserId)
      .limit(1)
      .maybeSingle();

    if (existingReport?.id) {
      return jsonResponse(200, {
        success: true,
        duplicate: true,
        reportId: existingReport.id
      });
    }
  }

  const { data: insertedReport, error: insertError } = await adminClient
    .from('happiness_item_reports')
    .insert({
      item_id: itemId,
      reported_item_owner_user_id: item.owner_user_id ?? null,
      reporter_user_id: reporterUserId,
      reason_codes: reasonCodes,
      other_reason: otherReason || null,
      item_snapshot_title: normalizeString(item.title).slice(0, 20),
      item_snapshot_description: normalizeString(item.description).slice(0, 100)
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    console.error('report-happiness-item insert failed', insertError);
    return jsonResponse(500, { success: false, code: 'INSERT_FAILED' });
  }

  return jsonResponse(200, {
    success: true,
    reportId: insertedReport?.id ?? null
  });
});
