import type { PayloadRequest } from 'payload'

// Only CMS users (the `users` collection) are admins. Applicants also log in,
// so "any logged-in user" must never be used as an access rule.
export const isAdmin = ({ req }: { req: PayloadRequest }) => req.user?.collection === 'users'
