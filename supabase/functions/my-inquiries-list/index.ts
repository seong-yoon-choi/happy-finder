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

  const userEmail = normalizeText(user.email).toLowerCase();

  if (!userEmail) {
    return jsonResponse(200, { success: true, inquiries: [] });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data, error } = await adminClient
    .from(WEBSITE_INQUIRIES_TABLE)
    .select('*')
    .eq('email', userEmail)
    .order('created_at', { ascending: false });

  if (error) {
    return jsonResponse(500, { error: 'list_failed' });
  }

  return jsonResponse(200, {
    success: true,
    inquiries: Array.isArray(data) ? data : []
  });
});
