// Calendar-day helpers for webcam captures, in the admin's own timezone.

const pad = (n: number) => String(n).padStart(2, '0')

// "2026-10-02" for the local day an ISO timestamp falls on.
export const dayKey = (value: string | Date) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// [from, to) covering that local day.
export const dayRange = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return { from: new Date(y, m - 1, d), to: new Date(y, m - 1, d + 1) }
}

export const formatDay = (key: string) =>
  dayRange(key).from.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m ? `${m} min ${s ? `${s} s` : ''}`.trim() : `${s} s`
}
