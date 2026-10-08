import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/assessment/server'
import { findApplicationByToken } from '@/recruitment/server'

type Args = { params: Promise<{ token: string }> }

// Step 4: the candidate books one open interview slot ({ slotId }). Saving the application
// emails the candidate a confirmation and notifies the Head of Plus (step 5).
export async function POST(request: Request, { params }: Args) {
  const { token } = await params
  const body = await request.json().catch(() => null)
  const slotId = Number(body?.slotId)

  const payload = await getPayloadClient()
  const application = await findApplicationByToken(payload, token)
  if (!application) {
    return NextResponse.json({ error: 'This scheduling link is not valid.' }, { status: 404 })
  }
  if (application.stage !== 'invited_to_schedule') {
    return NextResponse.json(
      { error: 'Your interview is already booked. Reload the page to see it.' },
      { status: 409 },
    )
  }
  if (!Number.isInteger(slotId)) {
    return NextResponse.json({ error: 'Choose a time.' }, { status: 400 })
  }

  // Claims the slot only if nobody else has, in a single update.
  const claimed = await payload.update({
    collection: 'interview-slots',
    where: {
      and: [
        { id: { equals: slotId } },
        { application: { exists: false } },
        { startsAt: { greater_than: new Date().toISOString() } },
      ],
    },
    data: { application: application.id },
    depth: 0,
  })
  const slot = claimed.docs[0]
  if (!slot) {
    return NextResponse.json(
      { error: 'Sorry, that time was just taken. Please choose another one.' },
      { status: 409 },
    )
  }

  await payload.update({
    collection: 'applications',
    id: application.id,
    data: { initialInterviewSlot: slot.id, initialInterviewAt: slot.startsAt },
  })

  return NextResponse.json({ ok: true })
}
