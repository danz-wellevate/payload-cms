import type { Payload } from 'payload'

import type { Application, Assessment, InterviewSlot, Job } from '@/payload-types'

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
export const sendAssessmentInvite = (payload: Payload, assessment: Assessment) =>
  send(
    payload,
    assessment.candidateEmail,
    'Your coding assessment is ready',
    layout([
      `Hi ${escapeHtml(assessment.candidateName?.trim() || 'there')},`,
      `You have been invited to a coding assessment${
        assessment.durationMinutes ? ` (${assessment.durationMinutes} minutes)` : ''
      }.`,
      assessment.expiresAt
        ? `Please complete it before <strong>${escapeHtml(formatDateTime(assessment.expiresAt))}</strong>.`
        : 'Start it whenever you are ready.',
      button(assessmentInviteLink(assessment.token ?? ''), 'Start the assessment'),
    ]),
  )

// An admin set up a login directly on the assessment ("Candidate login password") instead of
// the candidate signing up themselves: emails them the password so they can sign in right away.
export const sendApplicantLoginCreated = (payload: Payload, assessment: Assessment, password: string) => {
  const link = assessmentInviteLink(assessment.token ?? '')
  return send(
    payload,
    assessment.candidateEmail,
    'Your login for the coding assessment',
    layout([
      `Hi ${escapeHtml(assessment.candidateName?.trim() || 'there')},`,
      'An account was created for you so you can go straight to your coding assessment.',
      `Email: <strong>${escapeHtml(assessment.candidateEmail)}</strong><br/>Password: <strong>${escapeHtml(password)}</strong>`,
      button(link, 'Sign in and start the assessment'),
      `Or use this link: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`,
    ]),
  )
}

// Email failures are logged but never block saving the application.
const send = async (payload: Payload, to: string | string[], subject: string, html: string) => {
  const recipients = Array.isArray(to) ? to : [to]
  if (!recipients.length) return
  try {
    await payload.sendEmail({ to: recipients.join(', '), subject, html })
  } catch (err) {
    payload.logger.error({ err, msg: `Could not send "${subject}" to ${recipients.join(', ')}` })
  }
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
export const sendSchedulingInvite = (payload: Payload, app: Application, job: Job) =>
  send(
    payload,
    app.email,
    `Next step for ${job.title}`,
    layout([
      greeting(app),
      `Thank you for applying for <strong>${escapeHtml(job.title)}</strong>. We reviewed your resume and would like to invite you to an initial interview.`,
      "We'll be in touch shortly to confirm a time. You can check your application status anytime:",
      button(`${siteUrl()}/applicant/login`, 'View your status'),
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
export const sendAssessmentScheduled = (payload: Payload, app: Application, job: Job) =>
  send(
    payload,
    app.email,
    `You passed the initial interview for ${job.title}`,
    layout([
      greeting(app),
      `Congratulations, you passed the initial interview for <strong>${escapeHtml(job.title)}</strong>.`,
      `Your technical assessment is scheduled for <strong>${escapeHtml(formatDateTime(app.technicalAssessmentAt ?? ''))}</strong>.`,
      'At that time, sign in to My Profile with this email address and click <strong>Start technical assessment</strong>. It is a timed coding task in the browser. Your webcam and screen are recorded, and leaving the assessment window (for example with Alt+Tab) is reported.',
      button(`${siteUrl()}/applicant/login`, 'Go to My Profile'),
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
