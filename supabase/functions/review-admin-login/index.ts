import {
  getReviewAdminConfig,
  isReviewAdminCredentials,
  issueReviewAdminToken
} from '../_shared/reviewAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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

  const requestPayload = await req.json().catch(() => ({}));
  const usernameOrEmail = normalizeText(requestPayload?.usernameOrEmail);
  const password = normalizeText(requestPayload?.password);

  if (!isReviewAdminCredentials({ usernameOrEmail, password })) {
    return jsonResponse(401, { error: 'invalid_credentials' });
  }

  const reviewAdminConfig = getReviewAdminConfig();
  const sessionToken = await issueReviewAdminToken();

  return jsonResponse(200, {
    success: true,
    sessionToken,
    user: {
      id: 'review-admin-user',
      email: reviewAdminConfig.email
    }
  });
});
