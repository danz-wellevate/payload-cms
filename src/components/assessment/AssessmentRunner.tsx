'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'

import type { ClientEvent, ProctoringEventType, RecordingSource } from '@/assessment/events'
import type { PlaygroundEditor } from '@/components/playground/CodePlayground'

import type { ClipRecorder } from '@/assessment/clipRecorder'

import {
  SCREEN_BITS_PER_SECOND,
  startClipRecorder,
  WEBCAM_BITS_PER_SECOND,
} from '@/assessment/clipRecorder'
import { formatMinutes } from '@/assessment/events'
import { checkSharedScreen } from '@/assessment/screenCheck'
import { CodePlayground } from '@/components/playground/CodePlayground'
import { languages } from '@/playground/languages'
import { withBase } from '@/lib/basePath'

type Props = {
  token: string
  candidateName: string
  durationMinutes: number
  requireWebcam: boolean
  // Candidate must share their entire screen, which is recorded.
  recordScreen: boolean
  inProgress: boolean
  // True when the assessment has multi-task setup (decided on the server). Avoids flashing the
  // single-task instructions while the first task loads.
  hasTasks?: boolean
  // Where to send the candidate after they submit (e.g. the applicant dashboard).
  exitHref?: string
  // The task/instructions panel, rendered on the server. Used when the assessment has no
  // multi-task setup; otherwise the task panel below replaces it.
  children: React.ReactNode
}

type PasteRange = {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

type Phase = 'intro' | 'test' | 'submitting' | 'done' | 'timeout'
type Camera = 'off' | 'requesting' | 'on' | 'denied'
type ScreenShare =
  | 'off'
  | 'requesting'
  | 'checking'
  | 'on'
  | 'denied'
  | 'wrong-surface'
  | 'wrong-screen'
  | 'unsupported'

// State of the multi-task flow, as returned by the server. Only unlocked tasks are included and
// the expected answers are never sent to the browser.
type TaskState = {
  total: number
  current: number
  finished: boolean
  tasks: { title: string; prompt: unknown; code?: string | null; languageLabel?: string | null }[]
}
type AnswerStatus = 'idle' | 'checking' | 'correct' | 'wrong' | 'error'

// A task's code, kept per language so switching language never loses what was written.
type Draft = { languageId: number; codes: Record<number, string> }

const screenShareMessages: Partial<Record<ScreenShare, string>> = {
  denied:
    'Screen sharing was cancelled or blocked. Click the button and choose your entire screen.',
  'wrong-surface': 'Please share your entire screen, not a single window or tab.',
  'wrong-screen':
    "You shared a screen that isn't showing this test. Share again and pick the screen this window is on.",
  checking: 'Checking that the shared screen shows this test…',
  unsupported:
    "This browser can't share your screen. Use a desktop browser such as Chrome, Edge or Firefox.",
}

const FLUSH_INTERVAL_MS = 5_000
const TIMEOUT_REDIRECT_MS = 8_000
// How long submitting waits for the last webcam/screen clips to finish uploading.
const FINAL_CLIP_WAIT_MS = 20_000
// Short focus blips (e.g. OS notifications) are ignored; leaving the tab is always recorded.
const MIN_FOCUS_LOSS_MS = 1_000
// How often to re-check that the shared screen still shows the exam (e.g. the candidate moved
// the window to a second monitor that isn't the one they shared).
const SCREEN_VERIFY_INTERVAL_MS = 45_000

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

// The instructions panel for multi-task assessments: tabs to move between unlocked tasks, the
// task being viewed, and the result of the last check. Solved tasks can be reopened to improve
// their code; the "Done / Submit" button in the top bar does the checking.
const TaskPanel = ({
  state,
  view,
  status,
  message,
  onSelect,
}: {
  state: TaskState
  view: number
  status: AnswerStatus
  message: string | null
  onSelect: (index: number) => void
}) => {
  const complete = state.finished
  const revisiting = view < state.current
  const active = view < state.total ? state.tasks[view] : null
  const isLast = state.current + 1 >= state.total

  return (
    <div className="taskPanel">
      <p className="eyebrow">
        {view >= state.total
          ? `All ${state.total} tasks complete`
          : `Task ${view + 1} of ${state.total}`}
      </p>

      {(state.current > 0 || complete) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {state.tasks.slice(0, state.total).map((task, index) => (
            <button
              aria-current={view === index}
              className="button button--outline"
              key={index}
              onClick={() => onSelect(index)}
              style={{
                fontWeight: view === index ? 700 : 400,
                opacity: view === index ? 1 : 0.75,
                padding: '0.25rem 0.75rem',
              }}
              title={task.title}
              type="button"
            >
              {index < state.current ? '✓ ' : ''}Task {index + 1}
            </button>
          ))}
          {complete && (
            <button
              aria-current={view >= state.total}
              className="button button--outline"
              onClick={() => onSelect(state.total)}
              style={{
                fontWeight: view >= state.total ? 700 : 400,
                opacity: view >= state.total ? 1 : 0.75,
                padding: '0.25rem 0.75rem',
              }}
              type="button"
            >
              Finish
            </button>
          )}
        </div>
      )}

      {active && (
        <>
          <h2>{active.title}</h2>
          <RichText data={active.prompt as never} />

          {revisiting ? (
            <>
              <p className="muted" style={{ marginTop: '1rem' }}>
                You&apos;re revisiting a task you already solved. Edit and run your code, then press
                &ldquo;Done / Submit&rdquo; to replace your saved answer. If the new output
                doesn&apos;t match, your earlier saved answer is kept.
              </p>
              <button
                className="button button--outline"
                onClick={() => onSelect(state.current)}
                type="button"
              >
                {complete ? 'Back to finish' : `Back to Task ${state.current + 1}`}
              </button>
            </>
          ) : (
            <p className="muted" style={{ marginTop: '1rem' }}>
              Write your code and run it. When your program prints the expected output, press
              &ldquo;Done / Submit&rdquo; to {isLast ? 'finish' : 'move on to the next task'}.
            </p>
          )}

          {status === 'checking' && (
            <p className="muted" role="status">
              Checking your output…
            </p>
          )}
          {status === 'wrong' && (
            <p className="assessmentError" role="alert">
              {revisiting
                ? "Your output doesn't match, so your earlier saved answer for this task is kept."
                : "Your output doesn't match the expected output yet. Run your code, check the result and try again — your time keeps running."}
            </p>
          )}
          {status === 'error' && message && (
            <p className="assessmentError" role="alert">
              {message}
            </p>
          )}
        </>
      )}

      {view >= state.total && (
        <p className="lead">
          Every task is complete. Press &ldquo;Done / Submit&rdquo; to hand in your code, or go back
          to any task above to improve it first.
        </p>
      )}
    </div>
  )
}

export const AssessmentRunner = ({
  token,
  candidateName,
  durationMinutes,
  requireWebcam,
  recordScreen,
  inProgress,
  hasTasks = false,
  exitHref,
  children,
}: Props) => {
  const base = withBase(`/assessment/${token}`)
  // Candidate-facing task endpoints (see the Assessments collection).
  const taskApi = withBase(`/api/assessments/by-token/${token}`)

  const [phase, setPhase] = useState<Phase>('intro')
  const [error, setError] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [camera, setCamera] = useState<Camera>('off')
  const [screen, setScreen] = useState<ScreenShare>('off')
  // True while a periodic re-check (during the test) is sampling the shared screen for the
  // marker — same mechanism as the initial share, just run again later to catch the candidate
  // moving the exam to a monitor that isn't the one they shared.
  const [screenVerifying, setScreenVerifying] = useState(false)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [resume, setResume] = useState<{ code: string | null; languageId: number | null }>()
  // Used for webcam / screen share notices (not for tab or window switches).
  const [warning, setWarning] = useState<string | null>(null)
  // Live counters shown next to the webcam preview, mirroring the server's tabSwitches /
  // timeAwaySeconds fields (see events/route.ts) so what the candidate sees matches what ends
  // up on the assessment.
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [timeAwaySeconds, setTimeAwaySeconds] = useState(0)
  const [confirmingSubmit, setConfirmingSubmit] = useState(false)

  // Multi-task flow. `null` = not loaded yet or the assessment has a single task (legacy mode).
  const [taskState, setTaskState] = useState<TaskState | null>(null)
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('idle')
  const [answerMessage, setAnswerMessage] = useState<string | null>(null)
  const [tasksFailed, setTasksFailed] = useState(false)
  // Which task is on screen (can be an earlier, already solved one) and what the editor should
  // start with after switching (the editor is remounted per switch).
  const [view, setView] = useState(0)
  // Set when the candidate tries to leave an earlier task they changed; shows the
  // "save changes?" prompt. Holds the task they were heading to.
  const [pendingNav, setPendingNav] = useState<number | null>(null)
  const [seed, setSeed] = useState<{
    codes: Record<number, string>
    languageId: number | null
    key: number
  } | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<ClipRecorder | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const screenPreviewRef = useRef<HTMLVideoElement>(null)
  const screenRecorderRef = useRef<ClipRecorder | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const editorRef = useRef<PlaygroundEditor | null>(null)
  const languageIdRef = useRef<number>(languages[0].id)
  const stdinRef = useRef('')
  const queueRef = useRef<ClientEvent[]>([])
  const flushChainRef = useRef<Promise<void>>(Promise.resolve())
  const finishedRef = useRef(false)
  // Code of the tasks the candidate has left (per language), so going back and forth — or
  // switching language — never loses work.
  const draftsRef = useRef(new Map<number, Draft>())
  // Code of the languages the candidate has switched away from in the task currently on screen.
  const buffersRef = useRef<Record<number, string>>({})
  const seedKeyRef = useRef(0)
  const revisitingRef = useRef(false)
  const taskStateRef = useRef<TaskState | null>(null)

  const record = useCallback((type: ProctoringEventType, extra: Partial<ClientEvent> = {}) => {
    if (finishedRef.current) return
    queueRef.current.push({ type, at: new Date().toISOString(), ...extra })
  }, [])

  // Takes the queued events plus the current code (autosave).
  const takeBatch = useCallback(
    () => ({
      events: queueRef.current.splice(0),
      // While an earlier task is open, don't autosave its code over the current task's draft.
      code: revisitingRef.current ? undefined : editorRef.current?.getValue(),
      languageId: revisitingRef.current ? undefined : languageIdRef.current,
    }),
    [],
  )

  // Sends batches one at a time so the server's counters stay consistent.
  const flush = useCallback(() => {
    flushChainRef.current = flushChainRef.current.then(async () => {
      const batch = takeBatch()
      try {
        const res = await fetch(`${base}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
          keepalive: true,
        })
        if (!res.ok && res.status !== 409) throw new Error()
      } catch {
        queueRef.current.unshift(...batch.events) // retry on the next flush
      }
    })
    return flushChainRef.current
  }, [base, takeBatch])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const enableCamera = async () => {
    setCamera('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { ideal: 15 }, facingMode: 'user' },
        audio: false,
      })
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        // The camera stopped on its own (unplugged, taken by another app, revoked by the OS).
        // Webcam recording is optional, so this doesn't block the test — just logged.
        if (phaseRef.current === 'test') {
          record('camera_off')
          setWarning('Your webcam turned off. This has been recorded.')
          const recorder = recorderRef.current
          recorderRef.current = null
          void recorder?.stop()
        }
        if (streamRef.current === stream) streamRef.current = null
        setCamera('off')
      })
      streamRef.current = stream
      setCamera('on')
    } catch {
      setCamera('denied')
    }
  }

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current = null
  }

  // Asks the candidate to share their entire screen (not a window or tab).
  const shareScreen = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) return setScreen('unsupported')
    setScreen('requesting')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 5 },
          // Include the mouse pointer in the recording.
          cursor: 'always',
        } as MediaTrackConstraints,
        audio: false,
        // Chromium hints: offer whole screens first and don't allow switching mid-share.
        monitorTypeSurfaces: 'include',
        surfaceSwitching: 'exclude',
      } as DisplayMediaStreamOptions)
      const track = stream.getVideoTracks()[0]
      const surface = (track?.getSettings() as MediaTrackSettings & { displaySurface?: string })
        .displaySurface
      // Firefox doesn't report the surface, so only reject when we know it isn't a screen.
      if (surface && surface !== 'monitor') {
        stream.getTracks().forEach((t) => t.stop())
        return setScreen('wrong-surface')
      }

      // With several monitors, make sure they shared the one this test is on.
      setScreen('checking')
      if ((await checkSharedScreen(stream)) === 'wrong-screen') {
        stream.getTracks().forEach((t) => t.stop())
        return setScreen('wrong-screen')
      }

      track?.addEventListener('ended', () => {
        // The candidate clicked "Stop sharing" (or the screen went away). Screen recording is
        // optional, so this doesn't block the test — just logged.
        if (phaseRef.current === 'test') {
          record('screen_share_stopped')
          setWarning('Screen sharing stopped. This has been recorded.')
          const recorder = screenRecorderRef.current
          screenRecorderRef.current = null
          void recorder?.stop()
        }
        screenStreamRef.current = null
        setScreen('off')
      })
      screenStreamRef.current = stream
      setScreen('on')
    } catch {
      setScreen('denied')
    }
  }

  const uploadClip = useCallback(
    (source: RecordingSource) => async (clip: Blob, startedAt: Date, endedAt: Date) => {
      const form = new FormData()
      form.append('file', clip, 'clip')
      form.append('source', source)
      form.append('startedAt', startedAt.toISOString())
      form.append('endedAt', endedAt.toISOString())
      const res = await fetch(`${base}/recording`, { method: 'POST', body: form })
      if (!res.ok && res.status !== 409) throw new Error('Upload failed')
    },
    [base],
  )

  useEffect(() => {
    if (screenPreviewRef.current && screenStreamRef.current) {
      screenPreviewRef.current.srcObject = screenStreamRef.current
    }
  }, [screen, phase])

  // The preview <video> differs between the intro and test screens, so re-attach the stream.
  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [camera, phase])

  useEffect(
    () => () => {
      void recorderRef.current?.stop()
      void screenRecorderRef.current?.stop()
      stopCamera()
      stopScreenShare()
    },
    [],
  )

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // One recorder per stream per exam session; stopped by submit, by the camera or screen share
  // ending, or when leaving the page. (Effects can re-run, so guard with the refs.)
  useEffect(() => {
    if (phase !== 'test') return
    if (!recorderRef.current && streamRef.current && camera === 'on') {
      recorderRef.current = startClipRecorder(
        streamRef.current,
        uploadClip('webcam'),
        WEBCAM_BITS_PER_SECOND,
      )
    }
    if (!screenRecorderRef.current && screenStreamRef.current && screen === 'on') {
      screenRecorderRef.current = startClipRecorder(
        screenStreamRef.current,
        uploadClip('screen'),
        SCREEN_BITS_PER_SECOND,
      )
    }
  }, [phase, camera, screen, uploadClip])

  // Re-checks (every SCREEN_VERIFY_INTERVAL_MS) that the shared screen still shows the exam —
  // the same marker check run when sharing starts, repeated periodically so a candidate who
  // moves the window to an unshared monitor is caught instead of silently recording a blank
  // screen. getDisplayMedia can't be retargeted to another source without a fresh user gesture,
  // so the fix is to stop the stale share and prompt them to share the right screen again (the
  // "share" link already shown whenever `screen` isn't 'on').
  useEffect(() => {
    if (phase !== 'test' || !recordScreen || screen !== 'on') return
    let cancelled = false

    const interval = setInterval(async () => {
      const stream = screenStreamRef.current
      if (cancelled || !stream) return
      setScreenVerifying(true)
      const result = await checkSharedScreen(stream)
      setScreenVerifying(false)
      if (cancelled || phaseRef.current !== 'test' || screenStreamRef.current !== stream) return

      if (result === 'wrong-screen') {
        record('wrong_screen')
        setWarning(
          "The screen you're sharing doesn't show this window anymore. Share the correct screen to keep it recorded.",
        )
        const recorder = screenRecorderRef.current
        screenRecorderRef.current = null
        void recorder?.stop()
        stopScreenShare()
        setScreen('off')
      }
    }, SCREEN_VERIFY_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [phase, recordScreen, screen, record])

  // Once the test is running, load the multi-task state (also restores the right task when the
  // candidate resumes). If the assessment has no tasks, `total` is 0 and we stay in single-task
  // mode, showing the server-rendered instructions as before.
  useEffect(() => {
    if (phase !== 'test') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${taskApi}/tasks`, { cache: 'no-store' })
        if (!res.ok) throw new Error()
        const data = (await res.json()) as TaskState
        if (!cancelled && data.total > 0) {
          setTaskState(data)
          setView(data.current)
        }
      } catch {
        // Only a problem when the assessment is supposed to have tasks.
        if (!cancelled) setTasksFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phase, taskApi])

  // Keep refs in step with state for code that runs outside of renders (autosave, submit).
  useEffect(() => {
    taskStateRef.current = taskState
    revisitingRef.current = !!taskState && view < taskState.current
  }, [taskState, view])

  const languageIdFromLabel = (label?: string | null) =>
    label ? languages.find((language) => language.label === label)?.id : undefined

  // What the editor should show when opening a task: the candidate's own unsaved draft (every
  // language they used), else the code saved when they solved it, else a fresh editor for a task
  // they haven't started.
  const seedFor = (
    target: number,
    state: TaskState,
  ): { codes: Record<number, string>; languageId: number | null } => {
    const index = target >= state.total ? state.total - 1 : target
    const draft = draftsRef.current.get(index)
    if (draft) return { codes: { ...draft.codes }, languageId: draft.languageId }
    const saved = state.tasks[index]
    if (index < state.current && saved?.code) {
      const savedLanguage = languageIdFromLabel(saved.languageLabel) ?? languageIdRef.current
      return { codes: { [savedLanguage]: saved.code }, languageId: savedLanguage }
    }
    return { codes: {}, languageId: languageIdRef.current }
  }

  // Switches to another unlocked task. The task being left keeps whatever is in the editor.
  //  - skipPrompt: leave without asking (used after saving, or after choosing "don't update");
  //  - discard: drop the code typed in the task being left instead of keeping it as a draft.
  const goToView = (
    target: number,
    state: TaskState | null = taskState,
    options: { skipPrompt?: boolean; discard?: boolean } = {},
  ) => {
    if (!state) return
    const next = Math.max(0, Math.min(target, state.current))
    if (next === view && state === taskState) return

    // Leaving a solved task whose code (or language) was changed: ask whether to save first.
    if (!options.skipPrompt && view < state.current) {
      const saved = state.tasks[view]
      const savedLanguage = languageIdFromLabel(saved?.languageLabel)
      const languageChanged = savedLanguage != null && savedLanguage !== languageIdRef.current
      const current = editorRef.current?.getValue()
      if (saved?.code != null && current != null && (current !== saved.code || languageChanged)) {
        setPendingNav(next)
        return
      }
    }

    const leaving = view >= state.total ? state.total - 1 : view
    if (options.discard) {
      draftsRef.current.delete(leaving)
    } else if (editorRef.current) {
      draftsRef.current.set(leaving, {
        languageId: languageIdRef.current,
        codes: {
          ...buffersRef.current,
          [languageIdRef.current]: editorRef.current.getValue(),
        },
      })
    }
    void flush() // save the current task's code before it stops being autosaved

    const nextSeed = seedFor(next, state)
    if (nextSeed.languageId) languageIdRef.current = nextSeed.languageId
    buffersRef.current = { ...nextSeed.codes }
    seedKeyRef.current += 1
    setSeed({ ...nextSeed, key: seedKeyRef.current })
    setView(next)
    setAnswerStatus('idle')
    setAnswerMessage(null)
  }

  // Sends the code on screen to the server, which re-runs it and compares the output with the
  // expected output of the task being viewed. Resolves to the updated task state when it
  // matched, otherwise null. The countdown is untouched, so all tasks share one time limit.
  const checkTask = async (): Promise<TaskState | null> => {
    if (!taskState || view >= taskState.total || answerStatus === 'checking') return null
    setAnswerStatus('checking')
    setAnswerMessage(null)
    try {
      const res = await fetch(`${taskApi}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIndex: view,
          code: editorRef.current?.getValue() ?? '',
          languageId: languageIdRef.current,
          stdin: stdinRef.current,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (data.state) setTaskState(data.state as TaskState) // server is the source of truth
      if (!res.ok) {
        setAnswerStatus('error')
        setAnswerMessage(data.error ?? 'Could not check your output. Please try again.')
        return null
      }

      if (data.correct) {
        setAnswerStatus('correct')
        return data.state as TaskState
      }
      setAnswerStatus('wrong')
      return null
    } catch {
      setAnswerStatus('error')
      setAnswerMessage('Could not check your output. Check your connection and try again.')
      return null
    }
  }

  // "Done / Submit":
  //  - on the final "Finish" page: open the submit confirmation;
  //  - on an earlier, solved task: re-check it and, if it still matches, keep the improved code
  //    and return to where they were;
  //  - on the current task: check it — a match unlocks the next task, and after the last task
  //    the submit confirmation opens.
  // Without tasks it just opens the confirmation as before.
  const handleDone = async () => {
    if (!taskState || view >= taskState.total) {
      setConfirmingSubmit(true)
      return
    }

    const revisiting = view < taskState.current
    const next = await checkTask()
    if (!next) return

    if (revisiting) {
      setWarning(`Task ${view + 1} updated with your new code.`)
      goToView(next.current, next, { skipPrompt: true }) // back to the current task / finish page
      return
    }
    if (next.finished) {
      setView(next.total) // keep the editor as it is: it holds the last task's code
      setConfirmingSubmit(true)
      return
    }
    goToView(next.current, next, { skipPrompt: true })
  }

  // Prompt choices for leaving an earlier task whose code was changed.
  const saveChangesAndLeave = async () => {
    const target = pendingNav
    setPendingNav(null)
    if (target === null) return
    const next = await checkTask() // re-checks the task on screen
    if (!next) return // output didn't match: stay here; the earlier saved answer is kept
    setWarning(`Task ${view + 1} updated with your new code.`)
    goToView(target, next, { skipPrompt: true })
  }

  const leaveWithoutSaving = () => {
    const target = pendingNav
    setPendingNav(null)
    if (target === null) return
    goToView(target, taskState, { skipPrompt: true, discard: true })
  }

  const start = async () => {
    setError(null)

    try {
      const res = await fetch(`${base}/start`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not start the test.')

      setDeadline(data.deadline)
      setResume({ code: data.code, languageId: data.languageId })
      if (data.languageId) languageIdRef.current = data.languageId
      setPhase('test')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the test.')
    }
  }

  const submit = useCallback(
    async (reason?: 'time_expired') => {
      if (finishedRef.current) return
      setConfirmingSubmit(false)
      setPhase('submitting')

      let code = editorRef.current?.getValue() ?? ''
      let submitLanguageId = languageIdRef.current
      // If an earlier task is open (e.g. time ran out), hand in the latest task's code instead.
      const tasksNow = taskStateRef.current
      if (revisitingRef.current && tasksNow) {
        const draft = draftsRef.current.get(Math.min(tasksNow.current, tasksNow.total - 1))
        if (draft) {
          code = draft.codes[draft.languageId] ?? code
          submitLanguageId = draft.languageId
        }
      }
      // Finish the recordings first so their last clips are saved with the exam.
      const recorders = [recorderRef.current, screenRecorderRef.current]
      recorderRef.current = null
      screenRecorderRef.current = null
      await Promise.race([
        Promise.all(recorders.map((recorder) => recorder?.stop())),
        new Promise((resolve) => setTimeout(resolve, FINAL_CLIP_WAIT_MS)),
      ])
      await flush()
      finishedRef.current = true

      try {
        const res = await fetch(`${base}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            languageId: submitLanguageId,
            stdin: stdinRef.current,
            reason,
          }),
        })
        // 422 = tasks still unsolved; the server refused the early hand-in.
        if (res.status === 422) {
          const data = await res.json().catch(() => ({}))
          finishedRef.current = false
          setPhase('test')
          setError(data.error ?? 'Answer all tasks before submitting.')
          return
        }
        // 409 = already closed by the server (e.g. time ran out); the autosave was kept.
        if (!res.ok && res.status !== 409) throw new Error()
      } catch {
        finishedRef.current = false
        setPhase('test')
        setError('Your test could not be submitted. Check your connection and try again.')
        return
      }

      stopCamera()
      stopScreenShare()
      if (reason === 'time_expired') setPhase('timeout')
      else if (exitHref) window.location.assign(withBase(exitHref))
      else setPhase('done')
    },
    [base, exitHref, flush],
  )

  // Proctoring: tab/window switches and autosave (recording is handled above). Switching is
  // allowed, so it is only recorded — the candidate isn't shown a warning.
  useEffect(() => {
    if (phase !== 'test') return

    let awayStart: number | null = null
    let leftTab = false

    const goAway = () => {
      if (awayStart === null) {
        awayStart = Date.now()
        leftTab = false
      }
      if (document.hidden) leftTab = true
    }

    const comeBack = () => {
      if (awayStart === null || document.hidden || !document.hasFocus()) return
      const startedAt = awayStart
      const ms = Date.now() - startedAt
      awayStart = null
      if (!leftTab && ms < MIN_FOCUS_LOSS_MS) return

      const durationSeconds = Math.round(ms / 1000)
      record(leftTab ? 'left_tab' : 'lost_focus', {
        at: new Date(startedAt).toISOString(),
        durationSeconds,
      })
      setTabSwitchCount((n) => n + 1)
      setTimeAwaySeconds((s) => s + durationSeconds)
    }

    const onVisibility = () => (document.hidden ? goAway() : comeBack())

    const onPageHide = () => {
      const batch = takeBatch()
      navigator.sendBeacon(
        `${base}/events`,
        new Blob([JSON.stringify(batch)], { type: 'application/json' }),
      )
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', goAway)
    window.addEventListener('focus', comeBack)
    window.addEventListener('pagehide', onPageHide)

    if ((window.screen as Screen & { isExtended?: boolean }).isExtended) {
      record('multiple_monitors')
    }

    const flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)
    const clock = setInterval(() => setNow(Date.now()), 1_000)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', goAway)
      window.removeEventListener('focus', comeBack)
      window.removeEventListener('pagehide', onPageHide)
      clearInterval(flushTimer)
      clearInterval(clock)
    }
  }, [phase, base, flush, record, takeBatch])

  const remaining = deadline ? deadline - now : null

  // Auto-submit when the time runs out.
  useEffect(() => {
    if (phase === 'test' && remaining !== null && remaining <= 0) submit('time_expired')
  }, [phase, remaining, submit])

  useEffect(() => {
    if (!warning) return
    const timer = setTimeout(() => setWarning(null), 6_000)
    return () => clearTimeout(timer)
  }, [warning])

  const handleEditorMount = (editor: PlaygroundEditor) => {
    editorRef.current = editor
    editor.onDidPaste((e: { range: PasteRange }) => {
      const characters = editor.getModel()?.getValueInRange(e.range).length ?? 0
      if (characters > 0) record('paste', { characters })
    })
  }

  // Time ran out: tell the candidate, then send them back to the homepage.
  useEffect(() => {
    if (phase !== 'timeout') return
    const timer = setTimeout(() => window.location.assign(withBase('/')), TIMEOUT_REDIRECT_MS)
    return () => clearTimeout(timer)
  }, [phase])

  if (phase === 'timeout') {
    return (
      <section className="section">
        <div className="container assessmentMessage">
          <p className="eyebrow">Coding Assessment</p>
          <h1>Time limit reached</h1>
          <p className="lead">
            Your time limit of {formatMinutes(durationMinutes)} is up, so your code was submitted
            automatically. You&apos;ll be taken back to the homepage in a few seconds.
          </p>
          <div className="buttonGroup">
            <a className="button button--primary" href={withBase('/')}>
              Go to the homepage
            </a>
            {exitHref && (
              <a className="button button--outline" href={withBase(exitHref)}>
                View my dashboard
              </a>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (phase === 'done') {
    return (
      <section className="section">
        <div className="container assessmentMessage">
          <p className="eyebrow">Coding Assessment</p>
          <h1>Thanks, {candidateName}!</h1>
          <p className="lead">Your test has been submitted. You can close this tab now.</p>
        </div>
      </section>
    )
  }

  if (phase === 'intro') {
    return (
      <section className="section">
        {screen === 'checking' && <div aria-hidden="true" className="screenMarker" />}
        <div className="container assessmentIntro">
          <p className="eyebrow">Coding Assessment</p>
          <h1>Hi {candidateName}</h1>
          <p className="lead">
            {inProgress
              ? 'Your test is already in progress and the timer is still running. Resume when you are ready.'
              : `You have ${formatMinutes(durationMinutes)} to complete this test. The timer starts when you click Start.`}
          </p>

          <div className="assessmentIntro__card">
            <div className="assessmentIntro__body">
              <div className="assessmentIntro__grid">
                <div>
                  <h2>Before you begin</h2>
                  <ul className="assessmentRules">
                    <li>
                      Some tests have several tasks. Your program&apos;s output must match the
                      expected output before the next task appears (press Done / Submit to check).
                      The time limit covers all tasks together.
                    </li>
                    <li>
                      Switching to another tab, window or app is recorded, along with how long you
                      were away.
                    </li>
                    {requireWebcam && (
                      <li>
                        You may turn on your webcam below — if you do, it&apos;s recorded during the
                        test.
                      </li>
                    )}
                    {recordScreen && (
                      <li>
                        You may share your screen below — if you do, it&apos;s recorded during the
                        test. If your interviewer is already watching over a call (e.g. Teams), you
                        don&apos;t need to share here too.
                      </li>
                    )}
                    <li>Text pasted into the editor is recorded.</li>
                    <li>Your code is saved automatically as you work.</li>
                    <li>
                      Submit before the time runs out — the test is submitted automatically when it
                      does.
                    </li>
                  </ul>
                </div>

                <div>
                  <div className="assessmentChecks__header">
                    <h2>System check</h2>
                    <span className="assessmentChecks__badge">Optional</span>
                  </div>
                  <div className="assessmentChecks">
                    {requireWebcam && (
                      <div className="assessmentCamCheck">
                        <div className="assessmentCamCheck__head">
                          <h3>Webcam</h3>
                          <span className="assessmentCamCheck__status">
                            {camera === 'on' ? 'On' : 'Off'}
                          </span>
                        </div>
                        <div className="checkPreview checkPreview--webcam">
                          {camera === 'on' ? (
                            <video autoPlay muted playsInline ref={videoRef} />
                          ) : (
                            <span className="muted">
                              {camera === 'denied'
                                ? 'Camera access was blocked. Allow it in your browser settings, then try again.'
                                : 'Turn on your camera to check that you are visible.'}
                            </span>
                          )}
                        </div>
                        {camera !== 'on' && (
                          <button
                            className="button button--outline"
                            disabled={camera === 'requesting'}
                            onClick={enableCamera}
                            type="button"
                          >
                            {camera === 'requesting' ? 'Waiting for permission…' : 'Turn on camera'}
                          </button>
                        )}
                      </div>
                    )}

                    {recordScreen && (
                      <div className="assessmentCamCheck">
                        <div className="assessmentCamCheck__head">
                          <h3>Screen sharing</h3>
                          <span className="assessmentCamCheck__status">
                            {screen === 'on' ? 'Shared' : 'Not shared'}
                          </span>
                        </div>
                        <div className="checkPreview checkPreview--screen">
                          {screen === 'on' ? (
                            <video
                              aria-label="Preview of your shared screen"
                              autoPlay
                              muted
                              playsInline
                              ref={screenPreviewRef}
                            />
                          ) : (
                            <span className="muted">
                              {screenShareMessages[screen] ??
                                'Share your entire screen. A preview will appear here.'}
                            </span>
                          )}
                        </div>
                        {screen !== 'on' && screen !== 'unsupported' && (
                          <button
                            className="button button--outline"
                            disabled={screen === 'requesting' || screen === 'checking'}
                            onClick={shareScreen}
                            type="button"
                          >
                            {screen === 'requesting'
                              ? 'Waiting for your choice…'
                              : screen === 'checking'
                                ? 'Checking your screen…'
                                : 'Share entire screen'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <label className="assessmentConsent">
                <input
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  type="checkbox"
                />
                <span>
                  I understand that my activity
                  {requireWebcam || recordScreen
                    ? ', and my webcam or screen if I turn them on,'
                    : ''}{' '}
                  will be recorded during this test and shared with the hiring team.
                </span>
              </label>

              {error && <p className="assessmentError">{error}</p>}
            </div>

            <div className="assessmentIntro__footer">
              <p className="muted">
                {consent ? 'Ready to start.' : 'Please confirm the checkbox above to continue.'}
              </p>
              <button
                className="button button--primary"
                disabled={!consent}
                onClick={start}
                type="button"
              >
                {inProgress ? 'Resume test' : 'Start test'}
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="assessment">
      {(screen === 'checking' || screenVerifying) && (
        <div aria-hidden="true" className="screenMarker" />
      )}
      <div className="assessmentBar">
        <div className="container assessmentBar__inner">
          <strong>{candidateName}</strong>
          <span
            className={`assessmentTimer${remaining !== null && remaining < 5 * 60_000 ? ' is-low' : ''}`}
            role="timer"
          >
            {remaining !== null ? formatRemaining(remaining) : '--:--'}
          </span>
          <button
            className="button button--primary"
            disabled={phase === 'submitting' || answerStatus === 'checking'}
            onClick={handleDone}
            type="button"
          >
            {answerStatus === 'checking' ? 'Checking…' : 'Done / Submit'}
          </button>
        </div>
      </div>

      {error && (
        <div className="container">
          <p className="assessmentError">{error}</p>
        </div>
      )}

      <section className="section playgroundPage">
        <div className="container playground">
          <aside className="playground__instructions">
            {taskState ? (
              <TaskPanel
                message={answerMessage}
                onSelect={(index) => goToView(index)}
                state={taskState}
                status={answerStatus}
                view={view}
              />
            ) : hasTasks ? (
              <p className="muted" role={tasksFailed ? 'alert' : 'status'}>
                {tasksFailed
                  ? 'Your tasks could not be loaded. Check your connection and reload the page — your timer keeps running.'
                  : 'Loading your tasks…'}
              </p>
            ) : (
              children
            )}
          </aside>
          <CodePlayground
            initialCode={seed ? undefined : resume?.code}
            initialCodes={seed?.codes}
            initialLanguageId={seed ? seed.languageId : resume?.languageId}
            key={seed?.key ?? 0}
            modelPrefix={`assessment-${token}-${seed?.key ?? 0}`}
            onEditorMount={handleEditorMount}
            onLanguageChange={(id) => (languageIdRef.current = id)}
            onLanguageSwitch={(from, code) => {
              buffersRef.current[from] = code
            }}
            onRun={(status) => record('code_run', { detail: status })}
            onStdinChange={(value) => (stdinRef.current = value)}
          />
        </div>
      </section>

      {(requireWebcam || recordScreen) && (
        <div className="assessmentTracker">
          {requireWebcam &&
            (camera === 'on' ? (
              <video autoPlay className="assessmentCam" muted playsInline ref={videoRef} />
            ) : (
              <button
                className="button button--outline"
                disabled={camera === 'requesting'}
                onClick={enableCamera}
                type="button"
              >
                {camera === 'requesting' ? 'Waiting for permission…' : 'Turn on webcam'}
              </button>
            ))}
          <div className="assessmentTracker__status">
            {requireWebcam && (
              <span className="assessmentTracker__rec">
                {camera === 'on' && <span className="assessmentTracker__dot" aria-hidden="true" />}
                {camera === 'on' ? 'Recording' : 'Webcam off'}
              </span>
            )}
            <ul className="assessmentTracker__stats">
              <li>
                {tabSwitchCount} tab switch{tabSwitchCount === 1 ? '' : 'es'}
              </li>
              <li>{formatRemaining(timeAwaySeconds * 1000)} away</li>
              {recordScreen && (
                <li>
                  {screen === 'on' ? (
                    'Screen: shared'
                  ) : (
                    <>
                      Screen: not shared —{' '}
                      <button
                        className="linkButton"
                        disabled={screen === 'requesting' || screen === 'checking'}
                        onClick={shareScreen}
                        type="button"
                      >
                        share
                      </button>
                    </>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {warning && (
        <div className="assessmentWarning" role="alert">
          {warning}
        </div>
      )}

      {pendingNav !== null && taskState && (
        <div className="assessmentOverlay" role="dialog">
          <div className="assessmentOverlay__box">
            <h2>Save your changes to Task {view + 1}?</h2>
            <p>
              You changed your code for Task {view + 1}. Click &ldquo;Save changes&rdquo; to check
              it and replace your saved answer. If you don&apos;t update it, your earlier saved
              answer is kept and these changes are discarded.
            </p>
            <div className="buttonGroup">
              <button
                className="button button--primary"
                onClick={saveChangesAndLeave}
                type="button"
              >
                Save changes
              </button>
              <button className="button button--outline" onClick={leaveWithoutSaving} type="button">
                Don&apos;t update
              </button>
              <button
                className="button button--outline"
                onClick={() => setPendingNav(null)}
                type="button"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingSubmit && (
        <div className="assessmentOverlay" role="dialog">
          <div className="assessmentOverlay__box">
            {taskState && !taskState.finished ? (
              <>
                <h2>Not finished yet</h2>
                <p>
                  Answer all tasks before submitting — you have completed {taskState.current} of{' '}
                  {taskState.total}. If time runs out, your code is submitted automatically.
                </p>
                <div className="buttonGroup">
                  <button
                    className="button button--primary"
                    onClick={() => setConfirmingSubmit(false)}
                    type="button"
                  >
                    Keep working
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Are you done?</h2>
                <p>
                  Your code will be submitted for review. You won&apos;t be able to make changes
                  afterwards.
                </p>
                <div className="buttonGroup">
                  <button className="button button--primary" onClick={() => submit()} type="button">
                    Submit
                  </button>
                  <button
                    className="button button--outline"
                    onClick={() => setConfirmingSubmit(false)}
                    type="button"
                  >
                    Keep working
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="assessmentOverlay" role="status">
          <div className="assessmentOverlay__box">
            <h2>Submitting…</h2>
          </div>
        </div>
      )}
    </div>
  )
}
