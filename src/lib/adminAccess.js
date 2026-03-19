const DEFAULT_ADMIN_EMAILS = ['sychoi04180605@gmail.com'];

export const getAdminEmails = () => {
  const rawValue = typeof import.meta.env.VITE_SUPPORT_ADMIN_EMAILS === 'string'
    ? import.meta.env.VITE_SUPPORT_ADMIN_EMAILS
    : '';

  const emails = rawValue
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  return emails.length > 0 ? emails : DEFAULT_ADMIN_EMAILS;
};

export const isAdminEmail = (email) => {
  if (typeof email !== 'string') {
    return false;
  }

  return getAdminEmails().includes(email.trim().toLowerCase());
};
