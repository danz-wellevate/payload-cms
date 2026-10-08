// Interview and assessment times in emails and on the server-rendered pages are shown in this
// time zone (set HIRING_TIME_ZONE in .env to change it).
export const HIRING_TIME_ZONE = process.env.HIRING_TIME_ZONE || 'Asia/Manila'

export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

export const formatDateTime = (value: string | Date) =>
  // e.g. "Thursday, October 8, 2026 at 6:05 PM GMT+8" (dateStyle can't be combined with
  // timeZoneName, so the parts are listed one by one).
  new Date(value).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: HIRING_TIME_ZONE,
    timeZoneName: 'short',
  })

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
