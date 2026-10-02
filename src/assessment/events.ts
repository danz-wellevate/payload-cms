// Proctoring events recorded during an assessment. Shared by the admin config,
// the API routes and the candidate's browser.
export const proctoringEventTypes = [
  { value: 'started', label: 'Started the test' },
  { value: 'resumed', label: 'Reloaded / resumed the test' },
  { value: 'left_tab', label: 'Left the test tab' },
  { value: 'lost_focus', label: 'Switched to another window' },
  { value: 'fullscreen_exit', label: 'Exited full screen' },
  { value: 'paste', label: 'Pasted into the editor' },
  { value: 'camera_off', label: 'Webcam stopped' },
  { value: 'screen_share_stopped', label: 'Stopped sharing screen' },
  { value: 'multiple_monitors', label: 'Multiple monitors detected' },
  { value: 'code_run', label: 'Ran code' },
  { value: 'time_expired', label: 'Time ran out' },
  { value: 'submitted', label: 'Submitted' },
] as const

export type ProctoringEventType = (typeof proctoringEventTypes)[number]['value']

// Events the browser is allowed to report; the rest are recorded by the server.
export const clientEventTypes: ProctoringEventType[] = [
  'left_tab',
  'lost_focus',
  'fullscreen_exit',
  'paste',
  'camera_off',
  'screen_share_stopped',
  'multiple_monitors',
  'code_run',
]

export type ClientEvent = {
  type: ProctoringEventType
  at: string
  durationSeconds?: number
  characters?: number
  detail?: string
}

// Events reviewers should look at; the rest are informational.
export const flaggedEventTypes: ProctoringEventType[] = [
  'left_tab',
  'lost_focus',
  'fullscreen_exit',
  'paste',
  'camera_off',
  'screen_share_stopped',
  'multiple_monitors',
]

export type RecordingSource = 'webcam' | 'screen'

export const formatMinutes = (minutes: number) => `${minutes} minute${minutes === 1 ? '' : 's'}`
