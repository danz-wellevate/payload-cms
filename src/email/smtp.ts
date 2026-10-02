// Emails are only sent once SMTP host, user and password are all set (see .env).
export const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

// Without SMTP in local development, the applicant portal shows set-password links on screen
// so you can still sign in. Never enabled in production.
export const showEmailLinksOnScreen = () =>
  !smtpConfigured() && process.env.NODE_ENV === 'development'
