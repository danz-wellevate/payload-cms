import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { rejectEmailUsedBy } from '../hooks/rejectEmailUsedBy'

export const DEFAULT_TIME_LIMIT_MINUTES = 30

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

export const setPasswordLink = (token: string) =>
  `${siteUrl()}/applicant/set-password?token=${encodeURIComponent(token)}`

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// People taking the coding exam. They sign up with just an email at /applicant/login,
// then set a password from the emailed link. They can't use the admin panel.
export const Applicants: CollectionConfig = {
  slug: 'applicants',
  labels: { singular: 'Applicant', plural: 'Applicants' },
  admin: {
    group: 'Assessments',
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'timeLimitMinutes', 'passwordSet', 'createdAt'],
    description:
      "Applicants sign up themselves at /applicant/login. Set each one's exam time limit here.",
  },
  auth: {
    tokenExpiration: 60 * 60 * 8, // 8 hours
    forgotPassword: {
      // Also used for the first "set your password" email, so give it a full day.
      expiration: 24 * 60 * 60 * 1000,
      generateEmailSubject: () => 'Set your password for the coding exam',
      generateEmailHTML: (args) => {
        const link = setPasswordLink(args?.token ?? '')
        return `
          <p>Hi,</p>
          <p>Use the link below to set your password and open your applicant dashboard:</p>
          <p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
          <p>This link expires in 24 hours. If you didn't request it, you can ignore this email.</p>
        `
      },
    },
  },
  hooks: {
    beforeValidate: [
      rejectEmailUsedBy(
        'users',
        'This email belongs to an admin. Applicants must use a different email.',
      ),
      // An admin setting the password (Admin → Applicants) completes sign-up, so the portal
      // asks for that password instead of emailing a set-password link.
      ({ data, req }) => {
        if (data && typeof data.password === 'string' && data.password && isAdmin({ req })) {
          data.passwordSet = true
        }
        return data
      },
    ],
    // Changing an applicant's time limit also updates exams they haven't started yet.
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || doc.timeLimitMinutes === previousDoc?.timeLimitMinutes) return
        await req.payload.update({
          collection: 'assessments',
          where: {
            and: [{ applicant: { equals: doc.id } }, { status: { equals: 'invited' } }],
          },
          data: { durationMinutes: doc.timeLimitMinutes },
          req,
        })
      },
    ],
  },
  access: {
    read: ({ req }) =>
      isAdmin({ req }) ||
      (req.user?.collection === 'applicants' ? { id: { equals: req.user.id } } : false),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'timeLimitMinutes',
      label: 'Exam time limit (minutes)',
      type: 'number',
      defaultValue: DEFAULT_TIME_LIMIT_MINUTES,
      min: 1,
      max: 480,
      required: true,
      admin: { description: "Used for new exams, and updates any exam they haven't started yet." },
    },
    {
      name: 'passwordSet',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Whether the applicant has finished signing up.',
      },
    },
    {
      name: 'assessments',
      label: 'Exam submissions',
      type: 'join',
      collection: 'assessments',
      on: 'applicant',
      admin: {
        allowCreate: false,
        defaultColumns: ['status', 'result', 'languageLabel', 'completedAt'],
      },
    },
  ],
}
