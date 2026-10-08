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

// Step 1: a candidate applies with their email and resume (multipart form: email, name, resume).
// The AI review (step 2) runs after the response is sent, so the candidate doesn't wait for it.
export async function POST(request: Request, { params }: Args) {
  const { slug } = await params
  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid form.' }, { status: 400 })

  const email = normalizeEmail(form.get('email'))
  const name = String(form.get('name') ?? '')
    .trim()
    .slice(0, 120)
  const file = form.get('resume')

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Attach your resume.' }, { status: 400 })
  }
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Upload your resume as a PDF or Word (.docx) file.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: 'The resume must be 5 MB or smaller.' }, { status: 400 })
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

  // Payload checks the file's real contents, not just its extension.
  let resume
  try {
    resume = await payload.create({
      collection: 'resumes',
      data: {},
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name.replace(/[^\w.-]+/g, '_').slice(-100) || 'resume',
        size: file.size,
      },
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: "We couldn't read that file. Please upload a valid PDF or Word (.docx) file." },
        { status: 400 },
      )
    }
    throw err
  }

  const applicant = await findOrCreateApplicant(payload, email, name)

  const application = await payload.create({
    collection: 'applications',
    data: {
      email,
      name: name || undefined,
      job: job.id,
      resume: resume.id,
      applicant: applicant.id,
      aiStatus: 'pending',
    },
  })

  after(() => runAIReview(payload, application.id))

  return NextResponse.json({ ok: true })
}
