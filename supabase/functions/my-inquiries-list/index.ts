import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const WEBSITE_INQUIRIES_TABLE = 'website_inquiries';

const jsonResponse = (status: number, payload: Record<string, unknown>) => (
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
);

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const getInquiryKey = (value: Record<string, unknown>) => {
  const id = normalizeText(value.id);

  if (id) {
    return id;
  }

  return JSON.stringify(value);
};

const getInquirySortTime = (value: Record<string, unknown>) => {
  const createdAt = normalizeText(value.created_at);

  if (!createdAt) {
    return 0;
  }

  const timestamp = Date.parse(createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const mergeInquiries = (...lists: Record<string, unknown>[][]) => {
  const merged = new Map<string, Record<string, unknown>>();

  lists.flat().forEach(inquiry => {
    merged.set(getInquiryKey(inquiry), inquiry);
  });

  return Array.from(merged.values())
    .sort((left, right) => getInquirySortTime(right) - getInquirySortTime(left));
};

const listInquiriesByColumn = async ({
  adminClient,
  column,
  value
}: {
  adminClient: ReturnType<typeof createClient>,
  column: string,
  value: string
}) => {
  if (!value) {
    return [];
  }

  const { data, error } = await adminClient
    .from(WEBSITE_INQUIRIES_TABLE)
    .select('*')
    .eq(column, value)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
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

  const userId = normalizeText(user.id);
  const userEmail = normalizeText(user.email).toLowerCase();

  if (!userId && !userEmail) {
    return jsonResponse(200, { success: true, inquiries: [] });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  try {
    const [accountLinkedInquiries, accountEmailInquiries, replyEmailInquiries] = await Promise.all([
      listInquiriesByColumn({
        adminClient,
        column: 'account_user_id',
        value: userId
      }),
      listInquiriesByColumn({
        adminClient,
        column: 'account_email',
        value: userEmail
      }),
      listInquiriesByColumn({
        adminClient,
        column: 'email',
        value: userEmail
      })
    ]);

    return jsonResponse(200, {
      success: true,
      inquiries: mergeInquiries(
        accountLinkedInquiries,
        accountEmailInquiries,
        replyEmailInquiries
      )
    });
  } catch (_error) {
    return jsonResponse(500, { error: 'list_failed' });
  }
});
