import { NextResponse } from 'next/server'

import { getSessionUser } from '@/applicant/server'
import { runCode } from '@/playground/judge0'
import { findLanguage } from '@/playground/languages'

const MAX_SOURCE_LENGTH = 64 * 1024
const MAX_STDIN_LENGTH = 16 * 1024

type RunRequest = {
  languageId?: unknown
  sourceCode?: unknown
  stdin?: unknown
}

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })

// POST /playground/run { languageId, sourceCode, stdin } -> runs the code once on Judge0
export async function POST(request: Request) {
  // Only signed-in applicants (taking the exam) and admins may run code.
  const user = await getSessionUser()
  if (user?.collection !== 'applicants' && user?.collection !== 'users') {
    return NextResponse.json({ error: 'Please sign in to run code.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as RunRequest | null
  if (!body) return badRequest('Invalid JSON body.')

  const { languageId, sourceCode, stdin } = body
  if (typeof languageId !== 'number' || !findLanguage(languageId)) {
    return badRequest('Unsupported language.')
  }
  if (typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return badRequest('Write some code first.')
  }
  if (sourceCode.length > MAX_SOURCE_LENGTH) return badRequest('Source code is too long.')
  if (stdin !== undefined && typeof stdin !== 'string') return badRequest('Invalid input.')
  if (typeof stdin === 'string' && stdin.length > MAX_STDIN_LENGTH) {
    return badRequest('Input is too long.')
  }

  try {
    const result = await runCode({ languageId, sourceCode, stdin: stdin ?? '' })
    return NextResponse.json({ result })
  } catch (error) {
    console.error('[playground] Judge0 request failed', error)
    return NextResponse.json(
      { error: 'The code runner is unavailable right now. Please try again in a moment.' },
      { status: 502 },
    )
  }
}
