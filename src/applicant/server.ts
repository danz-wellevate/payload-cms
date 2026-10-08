import type { Payload } from 'payload'

import { randomBytes } from 'crypto'
import { headers } from 'next/headers'
import { generateExpiredPayloadCookie, generatePayloadCookie } from 'payload/shared'

import type { Applicant } from '@/payload-types'

import { getPayloadClient } from '@/assessment/server'
import { DEFAULT_TIME_LIMIT_MINUTES } from '@/collections/Applicants'

export const normalizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

export const isValidEmail = (email: string) =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const MIN_PASSWORD_LENGTH = 8

// Admin emails can't be used on the applicant portal. The message doesn't say why, so the
// portal can't be used to discover which addresses are admin accounts.
export const ADMIN_EMAIL_ERROR =
  "This email can't be used for the applicant portal. Please use a different email address."

export const isAdminEmail = async (payload: Payload, email: string) =>
  (
    await payload.count({
      collection: 'users',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
  ).totalDocs > 0

// The applicant account for an email, created on first use (sign-up or applying for a job).
// New accounts get a placeholder password nobody knows; it is replaced when the applicant
// follows the emailed set-password link.
export const findOrCreateApplicant = async (payload: Payload, email: string, name?: string) => {
  const { docs } = await payload.find({
    collection: 'applicants',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) return docs[0]

  return payload.create({
    collection: 'applicants',
    data: {
      email,
      name: name || undefined,
      password: randomBytes(32).toString('base64url'),
      passwordSet: false,
      timeLimitMinutes: DEFAULT_TIME_LIMIT_MINUTES,
    },
  })
}

// Whoever is logged in for the current request: an applicant, a CMS admin (`users`) or nobody.
export const getSessionUser = async () => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user
}

// The logged-in applicant for the current request, or null (admins don't count).
export const getCurrentApplicant = async (): Promise<Applicant | null> => {
  const user = await getSessionUser()
  return user?.collection === 'applicants'
    ? (user as Applicant & { collection: 'applicants' })
    : null
}

// Only same-site paths are allowed as a post-login destination.
export const safeNextPath = (value: unknown) =>
  typeof value === 'string' && /^\/(applicant|assessment)(\/[\w-]*)*$/.test(value)
    ? value
    : undefined

export const loginUrl = (next?: string) =>
  next ? `/applicant/login?next=${encodeURIComponent(next)}` : '/applicant/login'

// The applicant's exam: one linked to their account, or an admin-created invite sent to their
// email that isn't linked yet (it gets linked here).
export const findApplicantExam = async (payload: Payload, applicant: Applicant) => {
  const linked = await payload.find({
    collection: 'assessments',
    where: { applicant: { equals: applicant.id } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
  })
  if (linked.docs[0]) return linked.docs[0]

  const invited = await payload.find({
    collection: 'assessments',
    where: {
      and: [{ candidateEmail: { equals: applicant.email } }, { applicant: { exists: false } }],
    },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
  })
  if (!invited.docs[0]) return undefined

  return payload.update({
    collection: 'assessments',
    id: invited.docs[0].id,
    data: { applicant: applicant.id },
  })
}

const cookieArgs = (payload: Payload) => ({
  collectionAuthConfig: payload.collections.applicants.config.auth,
  cookiePrefix: payload.config.cookiePrefix,
})

export const sessionCookie = (payload: Payload, token: string) =>
  generatePayloadCookie({ ...cookieArgs(payload), token })

export const expiredSessionCookie = (payload: Payload) =>
  generateExpiredPayloadCookie(cookieArgs(payload))
