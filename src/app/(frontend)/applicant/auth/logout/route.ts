import { NextResponse } from 'next/server'

import { expiredSessionCookie } from '@/applicant/server'
import { getPayloadClient } from '@/assessment/server'

// Form POST from the dashboard's "Log out" button.
export async function POST(request: Request) {
  const payload = await getPayloadClient()
  const response = NextResponse.redirect(new URL('/applicant/login', request.url), 303)
  response.headers.set('Set-Cookie', expiredSessionCookie(payload))
  return response
}
