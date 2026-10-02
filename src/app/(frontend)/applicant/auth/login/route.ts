import { NextResponse } from 'next/server'

import { ADMIN_EMAIL_ERROR, isAdminEmail, normalizeEmail, sessionCookie } from '@/applicant/server'
import { getPayloadClient } from '@/assessment/server'

// Step 2 of applicant login for returning applicants: { email, password }.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''

  const payload = await getPayloadClient()
  if (await isAdminEmail(payload, email)) {
    return NextResponse.json({ error: ADMIN_EMAIL_ERROR }, { status: 400 })
  }

  try {
    const { token } = await payload.login({ collection: 'applicants', data: { email, password } })
    if (!token) throw new Error('No token')

    const response = NextResponse.json({ ok: true })
    response.headers.set('Set-Cookie', sessionCookie(payload, token))
    return response
  } catch (error) {
    const locked = error instanceof Error && /locked/i.test(error.message)
    return NextResponse.json(
      {
        error: locked
          ? 'Too many failed attempts. Try again in a few minutes, or reset your password.'
          : 'Incorrect email or password.',
      },
      { status: 401 },
    )
  }
}
