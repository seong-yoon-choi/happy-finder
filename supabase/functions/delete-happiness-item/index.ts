import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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

  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return jsonResponse(200, { success: false, code: 'AUTH_REQUIRED' });
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
    return jsonResponse(200, { success: false, code: 'INVALID_AUTH' });
  }

  const payload = await req.json().catch(() => ({}));
  const itemId = normalizeString(payload?.itemId);

  if (!itemId) {
    return jsonResponse(200, { success: false, code: 'INVALID_ITEM' });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data: item, error: lookupError } = await adminClient
    .from('happiness_items')
    .select('id, source, owner_user_id')
    .eq('id', itemId)
    .maybeSingle();

  if (lookupError) {
    console.error('delete-happiness-item lookup failed', lookupError);
    return jsonResponse(500, { success: false, code: 'LOOKUP_FAILED' });
  }

  if (!item || item.source !== 'custom' || item.owner_user_id !== user.id) {
    return jsonResponse(200, { success: false, code: 'NOT_FOUND' });
  }

  const { error: deleteError } = await adminClient
    .from('happiness_items')
    .delete()
    .eq('id', itemId)
    .eq('source', 'custom')
    .eq('owner_user_id', user.id);

  if (deleteError) {
    console.error('delete-happiness-item delete failed', deleteError);
    return jsonResponse(500, { success: false, code: 'DELETE_FAILED' });
  }

  return jsonResponse(200, { success: true });
});
