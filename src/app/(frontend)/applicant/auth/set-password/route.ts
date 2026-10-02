import { NextResponse } from 'next/server'

import { MIN_PASSWORD_LENGTH, sessionCookie } from '@/applicant/server'
import { getPayloadClient } from '@/assessment/server'

// Completes sign-up (or a password reset) from the emailed link: { token, password, name? }.
// Logs the applicant in on success.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : ''

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    )
  }

  const payload = await getPayloadClient()
  try {
    const result = await payload.resetPassword({
      collection: 'applicants',
      data: { token, password },
      overrideAccess: true,
    })
    if (!result.token || !result.user) throw new Error('No token')

    await payload.update({
      collection: 'applicants',
      id: (result.user as { id: number }).id,
      data: { passwordSet: true, ...(name ? { name } : {}) },
    })

    const response = NextResponse.json({ ok: true })
    response.headers.set('Set-Cookie', sessionCookie(payload, result.token))
    return response
  } catch {
    return NextResponse.json(
      { error: 'This link is invalid or has expired. Request a new one from the login page.' },
      { status: 400 },
    )
  }
}
