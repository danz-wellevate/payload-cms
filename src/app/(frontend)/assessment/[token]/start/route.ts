import { NextResponse } from 'next/server'

import {
  deadlineOf,
  finalizeIfOverdue,
  findAssessmentByToken,
  getPayloadClient,
  isInviteExpired,
  logEvent,
} from '@/assessment/server'

type Args = { params: Promise<{ token: string }> }

// Starts the timer on the first call; later calls (page reloads) resume and are logged.
export async function POST(request: Request, { params }: Args) {
  const { token } = await params
  const payload = await getPayloadClient()
  const found = await findAssessmentByToken(payload, token)
  if (!found) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })

  let assessment = await finalizeIfOverdue(payload, found)
  if (assessment.status === 'completed') {
    return NextResponse.json({ error: 'This assessment has already been submitted.' }, { status: 409 })
  }
  if (isInviteExpired(assessment)) {
    return NextResponse.json({ error: 'This invite has expired.' }, { status: 410 })
  }

  const detail = request.headers.get('user-agent')?.slice(0, 250)

  if (assessment.status === 'invited') {
    assessment = await payload.update({
      collection: 'assessments',
      id: assessment.id,
      data: { status: 'in_progress', startedAt: new Date().toISOString() },
    })
    await logEvent(payload, assessment, 'started', { detail })
  } else {
    await logEvent(payload, assessment, 'resumed', { detail })
  }

  return NextResponse.json({
    deadline: deadlineOf(assessment),
    code: assessment.code ?? null,
    languageId: assessment.languageId ?? null,
  })
}
