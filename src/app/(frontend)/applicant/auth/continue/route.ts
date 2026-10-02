import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'

import { ADMIN_EMAIL_ERROR, isAdminEmail, isValidEmail, normalizeEmail } from '@/applicant/server'
import { getPayloadClient } from '@/assessment/server'
import { DEFAULT_TIME_LIMIT_MINUTES, setPasswordLink } from '@/collections/Applicants'
import { showEmailLinksOnScreen } from '@/email/smtp'

// Step 1 of applicant login. Creates the account on first visit (auto sign-up) and emails a
// set-password link; for applicants who already set a password, asks for it instead.
//   { email }               -> { next: 'password' | 'check-email' }
//   { email, resend: true } -> always emails a fresh link (forgot password)
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const payload = await getPayloadClient()
  if (await isAdminEmail(payload, email)) {
    return NextResponse.json({ error: ADMIN_EMAIL_ERROR }, { status: 400 })
  }

  const { docs } = await payload.find({
    collection: 'applicants',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  })
  let applicant = docs[0]

  if (!applicant) {
    applicant = await payload.create({
      collection: 'applicants',
      // Placeholder password nobody knows; replaced when they follow the emailed link.
      data: {
        email,
        password: randomBytes(32).toString('base64url'),
        passwordSet: false,
        timeLimitMinutes: DEFAULT_TIME_LIMIT_MINUTES,
      },
    })
  }

  if (applicant.passwordSet && !body?.resend) {
    return NextResponse.json({ next: 'password' })
  }

  // Local development without SMTP: hand the link back so it can be shown on screen.
  const onScreen = showEmailLinksOnScreen()

  try {
    const token = await payload.forgotPassword({
      collection: 'applicants',
      data: { email },
      disableEmail: onScreen,
    })
    if (onScreen && token) {
      return NextResponse.json({ next: 'check-email', devLink: setPasswordLink(token) })
    }
  } catch (error) {
    // Most likely the built-in rate limit (one email per 15 seconds per address).
    payload.logger.warn({ err: error, msg: `Could not send set-password email to ${email}` })
  }

  return NextResponse.json({ next: 'check-email' })
}
