import { createClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_SUPPORT_ADMIN_EMAILS = ['sychoi04180605@gmail.com'];
const DEFAULT_REVIEW_ADMIN_USERNAME = 'admin';
const DEFAULT_REVIEW_ADMIN_PASSWORD = '1234!';
const DEFAULT_REVIEW_ADMIN_EMAIL = 'admin@happyfinder.review';
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeIdentity = (value: unknown) => normalizeText(value).toLowerCase();

const encodeBase64Url = (value: string | Uint8Array) => {
  const bytes = typeof value === 'string' ? textEncoder.encode(value) : value;
  let binary = '';

  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const decodeBase64Url = (value: string) => {
  const normalizedValue = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  const binary = atob(normalizedValue);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};

const decodeJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(textDecoder.decode(decodeBase64Url(value))) as T;
  } catch {
    return null;
  }
};

const getSigningSecret = () => (
  Deno.env.get('REVIEW_ADMIN_SESSION_SECRET')
  || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  || ''
);

const getHmacKey = async () => {
  const signingSecret = getSigningSecret();

  if (!signingSecret) {
    throw new Error('missing_review_admin_secret');
  }

  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
};

const signValue = async (value: string) => {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(value));
  return encodeBase64Url(new Uint8Array(signature));
};

export const getSupportAdminEmails = () => {
  const rawValue = Deno.env.get('SUPPORT_ADMIN_EMAILS') || '';
  const configuredEmails = rawValue
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  return configuredEmails.length > 0 ? configuredEmails : DEFAULT_SUPPORT_ADMIN_EMAILS;
};

export const getReviewAdminConfig = () => ({
  username: normalizeIdentity(Deno.env.get('REVIEW_ADMIN_USERNAME') || DEFAULT_REVIEW_ADMIN_USERNAME),
  password: Deno.env.get('REVIEW_ADMIN_PASSWORD') || DEFAULT_REVIEW_ADMIN_PASSWORD,
  email: normalizeIdentity(Deno.env.get('REVIEW_ADMIN_EMAIL') || DEFAULT_REVIEW_ADMIN_EMAIL)
});

export const isReviewAdminCredentials = ({
  usernameOrEmail = '',
  password = ''
}: {
  usernameOrEmail?: string,
  password?: string
}) => {
  const reviewAdminConfig = getReviewAdminConfig();
  const normalizedIdentity = normalizeIdentity(usernameOrEmail);

  if (!normalizedIdentity || password !== reviewAdminConfig.password) {
    return false;
  }

  return normalizedIdentity === reviewAdminConfig.username
    || normalizedIdentity === reviewAdminConfig.email;
};

export const issueReviewAdminToken = async () => {
  const reviewAdminConfig = getReviewAdminConfig();
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeBase64Url(JSON.stringify({
    sub: 'review-admin',
    email: reviewAdminConfig.email,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS
  }));
  const signature = await signValue(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
};

export const verifyReviewAdminToken = async (token: string) => {
  const normalizedToken = normalizeText(token);

  if (!normalizedToken) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = normalizedToken.split('.');

  if (!headerPart || !payloadPart || !signaturePart) {
    return null;
  }

  const header = decodeJson<{ alg?: string, typ?: string }>(headerPart);
  const payload = decodeJson<{ sub?: string, email?: string, exp?: number }>(payloadPart);

  if (!header || !payload || header.alg !== 'HS256' || payload.sub !== 'review-admin') {
    return null;
  }

  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const expectedSignature = await signValue(`${headerPart}.${payloadPart}`);

  if (expectedSignature !== signaturePart) {
    return null;
  }

  const reviewAdminConfig = getReviewAdminConfig();
  const payloadEmail = normalizeIdentity(payload.email);

  if (!payloadEmail || payloadEmail !== reviewAdminConfig.email) {
    return null;
  }

  return {
    email: reviewAdminConfig.email
  };
};

export const resolveAuthorizedAdminEmail = async ({
  supabaseUrl,
  supabaseAnonKey,
  authHeader,
  reviewAdminToken
}: {
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string | null,
  reviewAdminToken?: string
}) => {
  const verifiedReviewAdmin = await verifyReviewAdminToken(reviewAdminToken || '');

  if (verifiedReviewAdmin) {
    return {
      email: verifiedReviewAdmin.email
    };
  }

  if (normalizeText(reviewAdminToken)) {
    return {
      error: 'invalid_review_admin_session',
      status: 401
    };
  }

  if (!authHeader) {
    return {
      error: 'missing_authorization',
      status: 401
    };
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
    return {
      error: 'invalid_user',
      status: 401
    };
  }

  const userEmail = normalizeIdentity(user.email);

  if (!getSupportAdminEmails().includes(userEmail)) {
    return {
      error: 'forbidden',
      status: 403
    };
  }

  return {
    email: userEmail
  };
};
