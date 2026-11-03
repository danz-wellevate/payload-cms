import type { Payload } from 'payload'

import type { Application, Assessment, InterviewSlot, Job } from '@/payload-types'

import { setPasswordLink } from '../collections/Applicants'
import { escapeHtml, formatDateTime, siteUrl } from './format'

const brand = () => process.env.SMTP_FROM_NAME || 'Hiring Team'

const layout = (paragraphs: string[]) =>
  `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111827">${paragraphs
    .map((p) => `<p>${p}</p>`)
    .join('')}<p>— ${escapeHtml(brand())}</p></div>`

const button = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a>`

const greeting = (app: Pick<Application, 'name'>) =>
  `Hi ${escapeHtml(app.name?.trim() || 'there')},`

export const schedulingLink = (token: string) =>
  `${siteUrl()}/schedule/${encodeURIComponent(token)}`

export const adminApplicationLink = (id: number | string) =>
  `${siteUrl()}/admin/collections/applications/${id}`

export const assessmentInviteLink = (token: string) =>
  `${siteUrl()}/assessment/${encodeURIComponent(token)}`

// A coding assessment was created directly in the Assessments collection (not via the hiring
// pipeline, which emails its own "book your interview" / "technical assessment scheduled"
// messages instead — see sendAssessmentScheduled below).
// The button below goes straight to the assessment link; if the candidate hasn't registered
// yet, the page itself detects that and sends them to set their name and password first (see
// AssessmentPage), then on to the exam — so one link covers both pre-registration and the exam,
// no separate "portal" link needed.
export const sendAssessmentInvite = (payload: Payload, assessment: Assessment) =>
  send(
    payload,
    assessment.candidateEmail,
    'Your coding assessment is ready',
    layout([
      `Hi ${escapeHtml(assessment.candidateName?.trim() || 'there')},`,
      `This invite was sent to <strong>${escapeHtml(assessment.candidateEmail)}</strong>.`,
      `You have been invited to a coding assessment${
        assessment.durationMinutes ? ` (${assessment.durationMinutes} minutes)` : ''
      }.`,
      assessment.expiresAt
        ? `Please complete it before <strong>${escapeHtml(formatDateTime(assessment.expiresAt))}</strong>.`
        : 'Start it whenever you are ready.',
      "You'll be asked to set a name and password the first time — that's it, then you're straight into the exam.",
      button(assessmentInviteLink(assessment.token ?? ''), 'Register and start the assessment'),
    ]),
  )

// An admin set up a login directly on the assessment ("Candidate login password") instead of
// the candidate signing up themselves. That password is a master key for the admin, not the
// candidate's own, so this doesn't tell them to sign in with it (and never includes it in
// plaintext) — it sends them a one-time link to set their own password instead, same as a
// self-registering candidate gets. Once they do, `applicantPasswordSet` shows it in the admin.
export const sendApplicantLoginCreated = async (payload: Payload, assessment: Assessment) => {
  const link = await applicantPortalLink(
    payload,
    assessment.candidateEmail,
    `/assessment/${assessment.token ?? ''}`,
  )
  return send(
    payload,
    assessment.candidateEmail,
    'Your login for the coding assessment',
    layout([
      `Hi ${escapeHtml(assessment.candidateName?.trim() || 'there')},`,
      'An account was created for you. Set your password to go straight to your coding assessment.',
      `This invite was sent to <strong>${escapeHtml(assessment.candidateEmail)}</strong>.`,
      button(link, 'Set your password and start'),
    ]),
  )
}

// Portal link for a candidate who hasn't set a password yet (created silently when they
// applied): a one-time set-password link, so clicking it goes straight to password setup
// instead of the login page's "enter your email" step. Once they've registered, this falls
// back to the login page, pre-filled with their email so it skips straight to the password
// field instead of asking for the email again.
const applicantPortalLink = async (payload: Payload, email: string, next?: string) => {
  const { docs } = await payload.find({
    collection: 'applicants',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const applicant = docs[0]
  if (applicant && !applicant.passwordSet) {
    try {
      const token = await payload.forgotPassword({
        collection: 'applicants',
        data: { email },
        disableEmail: true,
      })
      if (token) {
        const link = setPasswordLink(token)
        return next ? `${link}&next=${encodeURIComponent(next)}` : link
      }
    } catch (err) {
      payload.logger.warn({ err, msg: `Could not create a set-password link for ${email}` })
    }
  }
  return `${siteUrl()}/applicant/login?email=${encodeURIComponent(email)}`
}

// Fires the SMTP send in the background instead of awaiting it, so saving the application
// (or whatever triggered the email) doesn't block on the connection handshake + delivery.
// Failures are logged but never surface to the caller.
const send = async (payload: Payload, to: string | string[], subject: string, html: string) => {
  const recipients = Array.isArray(to) ? to : [to]
  if (!recipients.length) return
  payload.sendEmail({ to: recipients.join(', '), subject, html }).catch((err) => {
    payload.logger.error({ err, msg: `Could not send "${subject}" to ${recipients.join(', ')}` })
  })
}

// Users with the Head of Plus role; every admin when nobody has it yet.
export const headOfPlusEmails = async (payload: Payload) => {
  const { docs } = await payload.find({
    collection: 'users',
    where: { role: { equals: 'head_of_plus' } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  if (docs.length) return docs.map((u) => u.email)
  const all = await payload.find({ collection: 'users', limit: 50, depth: 0, overrideAccess: true })
  return all.docs.map((u) => u.email)
}

// Step 2: a candidate applied. Fires on every new application, regardless of AI score.
export const notifyHeadOfPlusNewApplication = async (payload: Payload, app: Application, job: Job) =>
  send(
    payload,
    await headOfPlusEmails(payload),
    `New application: ${app.name || app.email} (${job.title})`,
    layout([
      'Hi,',
      `<strong>${escapeHtml(app.name || app.email)}</strong> (${escapeHtml(app.email)}) applied for <strong>${escapeHtml(job.title)}</strong>.`,
      app.resume
        ? 'A resume was attached. The AI review is running now and will invite them to schedule if they match.'
        : 'No resume was attached.',
      button(adminApplicationLink(app.id), 'Open the application'),
    ]),
  )

// Step 3: the AI score reached the job's minimum. The admin picks the interview time directly
// on the application (not the candidate); this just tells them they're moving forward.
export const sendSchedulingInvite = async (payload: Payload, app: Application, job: Job) =>
  send(
    payload,
    app.email,
    `Next step for ${job.title}`,
    layout([
      greeting(app),
      `Thank you for applying for <strong>${escapeHtml(job.title)}</strong>. We reviewed your resume and would like to invite you to an initial interview.`,
      "We'll be in touch shortly to confirm a time. You can check your application status anytime:",
      button(await applicantPortalLink(payload, app.email), 'View your status'),
    ]),
  )

// Step 4 (candidate copy): confirms the booked time.
export const sendInterviewBooked = (
  payload: Payload,
  app: Application,
  job: Job,
  slot: InterviewSlot | null,
) => {
  // Prefer the link pasted directly on the application (the normal path, since the admin sets
  // the time); fall back to a booked Interview Slot's link for any still-open legacy bookings.
  const meetingLink = app.initialInterviewLink || slot?.meetingLink
  return send(
    payload,
    app.email,
    `Your initial interview for ${job.title} is booked`,
    layout([
      greeting(app),
      `Your initial interview for <strong>${escapeHtml(job.title)}</strong> is on <strong>${escapeHtml(formatDateTime(app.initialInterviewAt ?? ''))}</strong>.`,
      meetingLink
        ? `Join here: <a href="${escapeHtml(meetingLink)}">${escapeHtml(meetingLink)}</a>`
        : 'We will send you the meeting details before the interview.',
    ]),
  )
}

// Step 5: tells the Head of Plus about the booked interview.
export const notifyHeadOfPlusInterview = async (payload: Payload, app: Application, job: Job) =>
  send(
    payload,
    await headOfPlusEmails(payload),
    `Initial interview booked: ${app.name || app.email} (${job.title})`,
    layout([
      'Hi,',
      `<strong>${escapeHtml(app.name || app.email)}</strong> (${escapeHtml(app.email)}) booked an initial interview for <strong>${escapeHtml(job.title)}</strong>.`,
      `When: <strong>${escapeHtml(formatDateTime(app.initialInterviewAt ?? ''))}</strong><br/>AI match score: <strong>${app.aiScore ?? '–'}%</strong>`,
      'After the interview, mark them Passed or Failed in the admin portal:',
      button(adminApplicationLink(app.id), 'Open the application'),
    ]),
  )

// Step 9: passed the initial interview, with the technical assessment schedule.
export const sendAssessmentScheduled = async (payload: Payload, app: Application, job: Job) =>
  send(
    payload,
    app.email,
    `You passed the initial interview for ${job.title}`,
    layout([
      greeting(app),
      `Congratulations, you passed the initial interview for <strong>${escapeHtml(job.title)}</strong>.`,
      `Your technical assessment is scheduled for <strong>${escapeHtml(formatDateTime(app.technicalAssessmentAt ?? ''))}</strong>.`,
      'At that time, sign in to My Profile with this email address and click <strong>Start technical assessment</strong>. It is a timed coding task in the browser. Your webcam and screen are recorded, and leaving the assessment window (for example with Alt+Tab) is reported.',
      button(await applicantPortalLink(payload, app.email), 'Go to My Profile'),
    ]),
  )

// Step 12: monitoring report once the candidate submits (or time runs out).
export const notifyHeadOfPlusAssessmentDone = async (
  payload: Payload,
  app: Application,
  assessment: Assessment,
  flaggedEvents: number,
) =>
  send(
    payload,
    await headOfPlusEmails(payload),
    `Technical assessment submitted: ${app.name || app.email}`,
    layout([
      'Hi,',
      `<strong>${escapeHtml(app.name || app.email)}</strong> finished the technical assessment${assessment.endedBy === 'time_expired' ? ' (time ran out)' : ''}.`,
      [
        `Left the assessment tab: <strong>${assessment.tabSwitches ?? 0}</strong> times`,
        `Time away: <strong>${assessment.timeAwaySeconds ?? 0}</strong> seconds`,
        `Full-screen exits: <strong>${assessment.fullscreenExits ?? 0}</strong>`,
        `Pastes: <strong>${assessment.pastes ?? 0}</strong> (${assessment.pastedCharacters ?? 0} characters)`,
        `Multiple monitors: <strong>${assessment.multipleMonitors ? 'yes' : 'no'}</strong>`,
        `Flagged events in total: <strong>${flaggedEvents}</strong>`,
      ].join('<br/>'),
      'Review the code, recordings and activity timeline, then mark the result Passed or Failed:',
      button(
        `${siteUrl()}/admin/collections/assessments/${assessment.id}/review`,
        'Review the assessment',
      ),
    ]),
  )

// Step 15: final interview schedule.
export const sendFinalInterview = (payload: Payload, app: Application, job: Job) =>
  send(
    payload,
    app.email,
    `Final interview for ${job.title}`,
    layout([
      greeting(app),
      `Great news: you passed the technical assessment for <strong>${escapeHtml(job.title)}</strong>.`,
      `Your final interview is on <strong>${escapeHtml(formatDateTime(app.finalInterviewAt ?? ''))}</strong>.`,
      app.finalInterviewDetails
        ? escapeHtml(app.finalInterviewDetails).replace(/\n/g, '<br/>')
        : 'We will send you the meeting details before the interview.',
    ]),
  )
