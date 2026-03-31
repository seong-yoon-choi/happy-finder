const DEFAULT_REVIEW_ADMIN_USERNAME = 'admin';
const DEFAULT_REVIEW_ADMIN_PASSWORD = '1234!';
const DEFAULT_REVIEW_ADMIN_EMAIL = 'admin@happyfinder.review';

const normalizeValue = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');

export const getReviewAdminUsername = () => (
  normalizeValue(import.meta.env.VITE_REVIEW_ADMIN_USERNAME) || DEFAULT_REVIEW_ADMIN_USERNAME
);

export const getReviewAdminPassword = () => {
  const configuredPassword = import.meta.env.VITE_REVIEW_ADMIN_PASSWORD;
  return typeof configuredPassword === 'string' && configuredPassword.length > 0
    ? configuredPassword
    : DEFAULT_REVIEW_ADMIN_PASSWORD;
};

export const getReviewAdminEmail = () => (
  normalizeValue(import.meta.env.VITE_REVIEW_ADMIN_EMAIL) || DEFAULT_REVIEW_ADMIN_EMAIL
);

export const isReviewAdminCredentials = ({ usernameOrEmail = '', password = '' }) => {
  const normalizedIdentity = normalizeValue(usernameOrEmail);

  if (!normalizedIdentity || password !== getReviewAdminPassword()) {
    return false;
  }

  return normalizedIdentity === getReviewAdminUsername()
    || normalizedIdentity === getReviewAdminEmail();
};

export const createReviewAdminUser = () => ({
  id: 'review-admin-user',
  email: getReviewAdminEmail(),
  app_metadata: {
    provider: 'review-admin',
    providers: ['review-admin']
  },
  user_metadata: {
    nickname: 'Admin',
    ageConfirmed: true,
    termsAccepted: true,
    privacyAccepted: true,
    marketingAccepted: false
  }
});
