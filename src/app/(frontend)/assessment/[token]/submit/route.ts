import { NextResponse } from 'next/server'

import { deadlineOf, GRACE_MS, loadActiveAssessment, logEvent } from '@/assessment/server'
import { runCode } from '@/playground/judge0'
import { findLanguage } from '@/playground/languages'

type Args = { params: Promise<{ token: string }> }

const MAX_CODE_LENGTH = 64 * 1024
const MAX_STDIN_LENGTH = 16 * 1024
const MAX_OUTPUT_LENGTH = 16 * 1024

const clip = (value: string) =>
  value.length > MAX_OUTPUT_LENGTH ? `${value.slice(0, MAX_OUTPUT_LENGTH)}\n… (truncated)` : value

// Final submission: saves the code, closes the attempt and records a server-side run of the
// submitted code so reviewers see output the candidate couldn't have tampered with.
export async function POST(request: Request, { params }: Args) {
  const { token } = await params
  const loaded = await loadActiveAssessment(token)
  if ('error' in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status })
  const { payload, assessment } = loaded

  const body = await request.json().catch(() => null)
  const timedOut = body?.reason === 'time_expired'
  const stdin = typeof body?.stdin === 'string' ? body.stdin.slice(0, MAX_STDIN_LENGTH) : ''

  // Fall back to the last autosave if the browser couldn't send the code.
  const submitted = typeof body?.languageId === 'number' ? findLanguage(body.languageId) : undefined
  const language = submitted ?? (assessment.languageId ? findLanguage(assessment.languageId) : undefined)
  const code =
    submitted && typeof body?.code === 'string'
      ? body.code.slice(0, MAX_CODE_LENGTH)
      : (assessment.code ?? '')

  let finalRun: Record<string, unknown> | undefined
  if (language && code.trim()) {
    try {
      const result = await runCode({ languageId: language.id, sourceCode: code, stdin })
      finalRun = {
        status: result.status.description,
        time: result.time,
        memory: result.memory,
        stdin,
        stdout: clip(result.stdout),
        errors: clip(result.compileOutput || result.stderr || result.message),
      }
    } catch {
      finalRun = { status: 'Not run — code runner unavailable', stdin }
    }
  }

  const now = Date.now()
  const deadline = deadlineOf(assessment)

  await logEvent(payload, assessment, timedOut ? 'time_expired' : 'submitted')
  await payload.update({
    collection: 'assessments',
    id: assessment.id,
    data: {
      status: 'completed',
      completedAt: new Date(now).toISOString(),
      endedBy: timedOut ? 'time_expired' : 'submitted',
      submittedLate: !!deadline && now > deadline + GRACE_MS,
      ...(language ? { code, languageId: language.id, languageLabel: language.label } : {}),
      ...(finalRun ? { finalRun } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}
