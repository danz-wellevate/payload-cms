import { NextResponse } from 'next/server'

import { findAssessmentByToken, getPayloadClient } from '@/assessment/server'

type Args = { params: Promise<{ token: string }> }

// Screen clips are larger than webcam clips.
const MAX_CLIP_BYTES = { webcam: 20 * 1024 * 1024, screen: 60 * 1024 * 1024 }
// The last clip is uploaded while the exam is being submitted, so accept it shortly after.
const LATE_UPLOAD_MS = 3 * 60 * 1000

// Stores one video clip (multipart: file, source, startedAt, endedAt) for the assessment.
export async function POST(request: Request, { params }: Args) {
  const { token } = await params
  const payload = await getPayloadClient()
  const assessment = await findAssessmentByToken(payload, token)
  if (!assessment) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })

  const recentlyCompleted =
    assessment.status === 'completed' &&
    !!assessment.completedAt &&
    Date.now() - new Date(assessment.completedAt).getTime() < LATE_UPLOAD_MS
  if (assessment.status !== 'in_progress' && !recentlyCompleted) {
    return NextResponse.json({ error: 'This assessment is not in progress.' }, { status: 409 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const mimetype = file instanceof Blob ? file.type.split(';')[0] : ''
  const source = form?.get('source') === 'screen' ? 'screen' : 'webcam'
  if (
    !(file instanceof Blob) ||
    !['video/webm', 'video/mp4'].includes(mimetype) ||
    file.size === 0 ||
    file.size > MAX_CLIP_BYTES[source]
  ) {
    return NextResponse.json({ error: 'Invalid recording.' }, { status: 400 })
  }

  const now = Date.now()
  const parse = (value: FormDataEntryValue | null | undefined, fallback: number) => {
    const time = typeof value === 'string' ? new Date(value).getTime() : NaN
    return new Date(isNaN(time) || time > now ? fallback : time)
  }
  const endedAt = parse(form?.get('endedAt'), now)
  const startedAt = parse(form?.get('startedAt'), endedAt.getTime())

  await payload.create({
    collection: 'proctoring-recordings',
    data: {
      assessment: assessment.id,
      source,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds: Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)),
    },
    file: {
      data: Buffer.from(await file.arrayBuffer()),
      mimetype,
      name: `assessment-${assessment.id}-${source}-${startedAt.getTime()}.${mimetype === 'video/mp4' ? 'mp4' : 'webm'}`,
      size: file.size,
    },
  })

  return NextResponse.json({ ok: true })
}
