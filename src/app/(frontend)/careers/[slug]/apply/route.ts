import { after, NextResponse } from 'next/server'
import { ValidationError } from 'payload'

import {
  ADMIN_EMAIL_ERROR,
  findOrCreateApplicant,
  isAdminEmail,
  isValidEmail,
  normalizeEmail,
} from '@/applicant/server'
import { getPayloadClient } from '@/assessment/server'
import { MAX_RESUME_BYTES, RESUME_MIME_TYPES } from '@/collections/Resumes'
import { runAIReview } from '@/recruitment/aiReview'

type Args = { params: Promise<{ slug: string }> }

const allowedTypes: string[] = Object.values(RESUME_MIME_TYPES)

type ApplyBody = {
  name?: unknown
  email?: unknown
  resume?: { data?: unknown; name?: unknown; type?: unknown } | null
}

// Step 1: a candidate applies with their email and resume (JSON body: name, email, resume as
// base64 — see ApplyForm.tsx for why this isn't multipart/form-data).
// The AI review (step 2) runs after the response is sent, so the candidate doesn't wait for it.
export async function POST(request: Request, { params }: Args) {
  const { slug } = await params
  const body = (await request.json().catch(() => null)) as ApplyBody | null
  if (!body) return NextResponse.json({ error: 'Invalid form.' }, { status: 400 })

  const email = normalizeEmail(body.email)
  const name = String(body.name ?? '')
    .trim()
    .slice(0, 120)
  const resume = body.resume

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'jobs',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'open' } }] },
    limit: 1,
    depth: 0,
  })
  const job = docs[0]
  if (!job) {
    return NextResponse.json({ error: 'This job is no longer open.' }, { status: 404 })
  }

  if (await isAdminEmail(payload, email)) {
    return NextResponse.json({ error: ADMIN_EMAIL_ERROR }, { status: 400 })
  }

  const duplicate = await payload.count({
    collection: 'applications',
    where: { and: [{ email: { equals: email } }, { job: { equals: job.id } }] },
  })
  if (duplicate.totalDocs > 0) {
    return NextResponse.json(
      { error: 'You have already applied for this job with this email address.' },
      { status: 409 },
    )
  }

  // Upload the resume only if one was attached.
  let resumeId: number | undefined
  if (resume && typeof resume.data === 'string' && resume.data.length > 0) {
    const mimetype = typeof resume.type === 'string' ? resume.type : ''
    const originalName = typeof resume.name === 'string' ? resume.name : 'resume'
    const data = Buffer.from(resume.data, 'base64')

    if (!allowedTypes.includes(mimetype)) {
      return NextResponse.json(
        { error: 'Upload your resume as a PDF or Word (.docx) file.' },
        { status: 400 },
      )
    }
    if (data.byteLength > MAX_RESUME_BYTES) {
      return NextResponse.json({ error: 'The resume must be 5 MB or smaller.' }, { status: 400 })
    }
    try {
      const created = await payload.create({
        collection: 'resumes',
        data: {},
        file: {
          data,
          mimetype,
          name: originalName.replace(/[^\w.-]+/g, '_').slice(-100) || 'resume',
          size: data.byteLength,
        },
      })
      resumeId = created.id
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json(
          { error: "We couldn't read that file. Please upload a valid PDF or Word (.docx) file." },
          { status: 400 },
        )
      }
      throw err
    }
  }

  const applicant = await findOrCreateApplicant(payload, email, name)

  const application = await payload.create({
    collection: 'applications',
    data: {
      email,
      name: name || undefined,
      job: job.id,
      resume: resumeId,
      applicant: applicant.id,
      aiStatus: 'pending',
    },
  })

  after(() => runAIReview(payload, application.id))

  return NextResponse.json({ ok: true })
}
