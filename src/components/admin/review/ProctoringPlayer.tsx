'use client'

import type { ProctoringEvent, ProctoringRecording } from '@/payload-types'

import { ConfirmationModal, toast, useConfig, useModal } from '@payloadcms/ui'
import {
  AlertTriangle,
  ExternalLink,
  Flag,
  Info,
  Monitor,
  Pause,
  Play,
  ShieldCheck,
  Trash2,
  Video,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ProctoringEventType } from '@/assessment/events'

import { CAPTURE_RETENTION_DAYS } from '@/assessment/captures'
import { flaggedEventTypes, proctoringEventTypes } from '@/assessment/events'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import '@/styles/shadcn.css'

import { dayKey, dayRange, formatDay, formatTime } from '../captureDates'

type Clip = { id: number; url: string; start: number; end: number }

const SPEEDS = [1, 2, 4, 8]
// Re-align a player when it drifts this far (seconds) from the shared playhead.
const MAX_DRIFT_S = 0.6
// Clicking an event starts playback a little before it.
const EVENT_LEAD_MS = 3_000
const RENDER_INTERVAL_MS = 200
// How long an event stays flashed on the video while playing.
const FLASH_MS = 3_000
// Clips are recorded back to back with tiny gaps, and recording starts a beat after the exam;
// treat a moment up to this close before a clip as part of it so playback doesn't flicker.
const GAP_TOLERANCE_MS = 1_000

const eventLabels = Object.fromEntries(
  proctoringEventTypes.map((t) => [t.value, t.label]),
) as Record<ProctoringEventType, string>
const isFlagged = (type: ProctoringEventType) => flaggedEventTypes.includes(type)

const toClips = (docs: ProctoringRecording[], source: 'webcam' | 'screen'): Clip[] =>
  docs
    .filter((d) => (d.source ?? 'webcam') === source && d.url)
    .map((d) => ({
      id: d.id,
      url: d.url as string,
      start: Date.parse(d.startedAt),
      end: Date.parse(d.endedAt),
    }))
    .sort((a, b) => a.start - b.start)

const clipAt = (clips: Clip[], t: number) =>
  clips.find((c) => t >= c.start - GAP_TOLERANCE_MS && t < c.end) ?? null

const elapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  return `${m}:${String(total % 60).padStart(2, '0')}`
}

const eventDetail = (e: ProctoringEvent) =>
  [
    e.durationSeconds != null && `away ${e.durationSeconds}s`,
    e.characters != null && `${e.characters} characters`,
    e.type === 'code_run' && e.detail,
  ]
    .filter(Boolean)
    .join(' · ')

// One video that follows the shared playhead `t`, switching clips at clip boundaries.
const SyncedVideo = ({
  clips,
  t,
  playing,
  rate,
  label,
  icon: Icon,
  caption = true,
  className,
  emptyHint,
}: {
  clips: Clip[]
  t: number
  playing: boolean
  rate: number
  label: string
  icon: React.ComponentType<{ className?: string }>
  caption?: boolean
  className?: string
  // Why there might be no recording at all, shown in the empty state.
  emptyHint?: string
}) => {
  const ref = useRef<HTMLVideoElement>(null)
  const clip = clipAt(clips, t)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (!clip) {
      if (!video.paused) video.pause()
      return
    }
    const want = Math.max(0, (t - clip.start) / 1000)
    if (video.dataset.clip !== String(clip.id)) {
      video.dataset.clip = String(clip.id)
      video.src = clip.url
      video.currentTime = want
    } else if (Math.abs(video.currentTime - want) > MAX_DRIFT_S) {
      video.currentTime = want
    }
    video.playbackRate = rate
    if (playing && video.paused) video.play().catch(() => undefined)
    if (!playing && !video.paused) video.pause()
  }, [clip, t, playing, rate])

  return (
    <figure className={cn('m-0 flex flex-col gap-1.5', className)}>
      {caption && (
        <figcaption className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <Icon className="size-3.5" /> {label}
        </figcaption>
      )}
      <div
        className={cn(
          'relative overflow-hidden rounded-lg',
          clips.length ? 'bg-black' : 'border border-dashed bg-muted',
        )}
      >
        <video
          aria-label={`${label} recording`}
          className={cn('block aspect-video w-full object-contain', !clip && 'invisible')}
          muted
          playsInline
          preload="auto"
          ref={ref}
        />
        {!clip &&
          (clips.length ? (
            <div className="absolute inset-0 grid place-items-center p-4 text-center text-[12px] text-white/70">
              No {label.toLowerCase()} recording at this moment
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center text-muted-foreground">
              <Icon className="size-6 opacity-60" />
              <span className="text-[13px] font-medium">
                No {label.toLowerCase()} recording for this exam
              </span>
              <span className="max-w-xs text-[11px]">{emptyHint}</span>
            </div>
          ))}
        {!caption && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
            <Icon className="size-3" /> {label}
          </span>
        )}
      </div>
    </figure>
  )
}

type Props = {
  assessmentId: number | string
  examStart?: string | null
  examEnd?: string | null
  // `panel`: compact, inside the edit form. `page`: the full-width Review page.
  layout?: 'panel' | 'page'
  // Link to the full Review page (shown in the panel layout).
  reviewHref?: string
}

// Screen + webcam recordings and the activity log on one shared clock: play, and the videos,
// timeline and activity feed all move together.
export const ProctoringPlayer = ({
  assessmentId,
  examStart,
  examEnd,
  layout = 'panel',
  reviewHref,
}: Props) => {
  const { openModal } = useModal()
  const {
    config: {
      routes: { api },
    },
  } = useConfig()

  const [recordings, setRecordings] = useState<ProctoringRecording[] | null>(null)
  const [events, setEvents] = useState<ProctoringEvent[] | null>(null)
  const [t, setT] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [deleteDay, setDeleteDay] = useState<string | null>(null)
  const [flash, setFlash] = useState<ProctoringEvent | null>(null)
  const tRef = useRef(0)
  const prevNowRef = useRef<number | null>(null)
  const feedRef = useRef<HTMLUListElement>(null)
  const modalSlug = `delete-recordings-${assessmentId}-${layout}`

  const load = useCallback(async () => {
    const get = async (collection: string, sort: string) => {
      const params = new URLSearchParams({
        'where[assessment][equals]': String(assessmentId),
        sort,
        limit: '2000',
        depth: '0',
      })
      const res = await fetch(`${api}/${collection}?${params}`, { credentials: 'include' })
      return ((await res.json().catch(() => ({}))).docs ?? []) as never[]
    }
    const [recs, evts] = await Promise.all([
      get('proctoring-recordings', 'startedAt'),
      get('proctoring-events', 'at'),
    ])
    setRecordings(recs)
    setEvents(evts)
  }, [api, assessmentId])

  useEffect(() => {
    void load()
  }, [load])

  const screenClips = useMemo(() => toClips(recordings ?? [], 'screen'), [recordings])
  const webcamClips = useMemo(() => toClips(recordings ?? [], 'webcam'), [recordings])

  // The review spans the exam and everything captured during it.
  const range = useMemo(() => {
    const times = [
      ...screenClips.flatMap((c) => [c.start, c.end]),
      ...webcamClips.flatMap((c) => [c.start, c.end]),
      ...(events ?? []).map((e) => Date.parse(e.at)),
      examStart ? Date.parse(examStart) : NaN,
      examEnd ? Date.parse(examEnd) : NaN,
    ].filter(Number.isFinite)
    if (!times.length) return null
    const start = Math.min(...times)
    return { start, end: Math.max(start + 1_000, ...times) }
  }, [screenClips, webcamClips, events, examStart, examEnd])

  const seek = useCallback(
    (time: number) => {
      if (!range) return
      tRef.current = Math.min(range.end, Math.max(range.start, time))
      setT(tRef.current)
    },
    [range],
  )

  // Open at the first recorded moment (the exam usually starts a moment before recording).
  useEffect(() => {
    if (!range || t !== null) return
    const firstClip = Math.min(screenClips[0]?.start ?? Infinity, webcamClips[0]?.start ?? Infinity)
    seek(Number.isFinite(firstClip) ? firstClip : range.start)
  }, [range, t, seek, screenClips, webcamClips])

  // Shared clock: advances the playhead in real time × speed; the videos follow it.
  useEffect(() => {
    if (!playing || !range) return
    let last = performance.now()
    let lastRender = 0
    let frame = 0
    const tick = (now: number) => {
      tRef.current = Math.min(range.end, tRef.current + (now - last) * rate)
      last = now
      if (tRef.current >= range.end) {
        setT(range.end)
        setPlaying(false)
        return
      }
      if (now - lastRender > RENDER_INTERVAL_MS) {
        lastRender = now
        setT(tRef.current)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, rate, range])

  const now = t ?? range?.start ?? 0
  const currentEvent = useMemo(
    () => [...(events ?? [])].reverse().find((e) => Date.parse(e.at) <= now + 250) ?? null,
    [events, now],
  )

  // While playing, flash each event on the video as the playhead passes it (not on seeks).
  useEffect(() => {
    const prev = prevNowRef.current
    prevNowRef.current = now
    if (!playing || prev === null || now <= prev || now - prev > 5_000) return
    const crossed = (events ?? []).filter((e) => {
      const at = Date.parse(e.at)
      return at > prev && at <= now
    })
    if (crossed.length) setFlash(crossed[crossed.length - 1])
  }, [now, playing, events])

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flash])

  // Keep the current event in view in the activity feed.
  useEffect(() => {
    const feed = feedRef.current
    if (!feed || !currentEvent) return
    const item = feed.querySelector<HTMLElement>(`[data-event="${currentEvent.id}"]`)
    if (!item) return
    const top = item.offsetTop - feed.clientHeight / 3
    if (Math.abs(feed.scrollTop - top) > 4) feed.scrollTo({ top, behavior: 'smooth' })
  }, [currentEvent])

  const flagged = useMemo(() => (events ?? []).filter((e) => isFlagged(e.type)), [events])
  const flagCounts = useMemo(() => {
    const counts = new Map<ProctoringEventType, number>()
    for (const e of flagged) counts.set(e.type, (counts.get(e.type) ?? 0) + 1)
    return [...counts.entries()]
  }, [flagged])
  const days = useMemo(
    () => [...new Set((recordings ?? []).map((r) => dayKey(r.startedAt)))],
    [recordings],
  )

  if (recordings === null || events === null) {
    return <p className="text-[13px] text-muted-foreground">Loading proctoring data…</p>
  }

  const pct = (time: number) =>
    range ? ((time - range.start) / (range.end - range.start)) * 100 : 0
  const nextFlag = flagged.find((e) => Date.parse(e.at) - EVENT_LEAD_MS > now + 500)
  const isPage = layout === 'page'

  const onTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!range) return
    const rect = e.currentTarget.getBoundingClientRect()
    seek(range.start + ((e.clientX - rect.left) / rect.width) * (range.end - range.start))
  }

  const confirmDelete = async () => {
    if (!deleteDay) return
    const { from, to } = dayRange(deleteDay)
    const res = await fetch(`${api}/proctoring-recordings/delete-range`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: from.toISOString(),
        to: to.toISOString(),
        assessment: assessmentId,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'Could not delete the recordings.')
      return
    }
    toast.success(`Deleted ${data.recordings} recording clip(s) from ${formatDay(deleteDay)}.`)
    setPlaying(false)
    setT(null)
    await load()
  }

  const flagBadges =
    flagCounts.length === 0 ? (
      <Badge className="text-[11px]" variant="secondary">
        No flags
      </Badge>
    ) : (
      flagCounts.map(([type, count]) => (
        <Badge className="text-[11px]" key={type} variant="destructive">
          {eventLabels[type]} {count}×
        </Badge>
      ))
    )

  const summary = (
    <>
      {screenClips.length} screen clip{screenClips.length === 1 ? '' : 's'} · {webcamClips.length}{' '}
      webcam clip{webcamClips.length === 1 ? '' : 's'} · {events.length} event
      {events.length === 1 ? '' : 's'}. Recordings are deleted automatically after{' '}
      {CAPTURE_RETENTION_DAYS} days.
    </>
  )

  const Lane = ({ clips }: { clips: Clip[] }) => (
    <div className="flex h-5 items-center">
      <div className="relative h-2.5 w-full rounded-full bg-muted">
        {clips.map((c) => (
          <span
            className="absolute inset-y-0 rounded-full bg-primary/70"
            key={c.id}
            style={{
              left: `${pct(c.start)}%`,
              width: `${Math.max(0.3, pct(c.end) - pct(c.start))}%`,
            }}
          />
        ))}
      </div>
    </div>
  )

  const flashOverlay = flash && (
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-white shadow-lg',
        isFlagged(flash.type) ? 'bg-destructive' : 'bg-black/75',
      )}
    >
      {isFlagged(flash.type) ? <AlertTriangle className="size-4" /> : <Info className="size-4" />}
      {eventLabels[flash.type]}
      {eventDetail(flash) && <span className="font-normal opacity-90">· {eventDetail(flash)}</span>}
    </div>
  )

  const screenHint =
    'Screen recording may have been off for this assessment, or the exam was taken before it existed.'
  const webcamHint = 'The webcam may have been off for this assessment.'

  const players =
    isPage && !screenClips.length ? (
      // No screen recording: the webcam takes the stage.
      <div className="relative">
        <SyncedVideo
          caption={false}
          clips={webcamClips}
          emptyHint={webcamHint}
          icon={Video}
          label="Webcam"
          playing={playing}
          rate={rate}
          t={now}
        />
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Monitor className="size-3.5" /> No screen recording for this exam. {screenHint}
        </p>
        {flashOverlay}
      </div>
    ) : isPage ? (
      // Screen as the stage, webcam as picture-in-picture.
      <div className="relative">
        <SyncedVideo
          caption={false}
          clips={screenClips}
          emptyHint={screenHint}
          icon={Monitor}
          label="Screen"
          playing={playing}
          rate={rate}
          t={now}
        />
        <SyncedVideo
          caption={false}
          className="absolute right-3 bottom-3 w-[26%] min-w-[160px] rounded-lg shadow-xl ring-2 ring-white/80"
          clips={webcamClips}
          emptyHint={webcamHint}
          icon={Video}
          label="Webcam"
          playing={playing}
          rate={rate}
          t={now}
        />
        {flashOverlay}
      </div>
    ) : (
      <div className="relative grid gap-3 lg:grid-cols-[2fr_1fr]">
        <SyncedVideo
          clips={screenClips}
          emptyHint={screenHint}
          icon={Monitor}
          label="Screen"
          playing={playing}
          rate={rate}
          t={now}
        />
        <SyncedVideo
          clips={webcamClips}
          emptyHint={webcamHint}
          icon={Video}
          label="Webcam"
          playing={playing}
          rate={rate}
          t={now}
        />
        {flashOverlay}
      </div>
    )

  const transport = range && (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        aria-label={playing ? 'Pause' : 'Play'}
        className="text-[13px]"
        onClick={() => {
          if (!playing && now >= range.end) seek(range.start)
          setPlaying(!playing)
        }}
        size={isPage ? 'default' : 'sm'}
        type="button"
      >
        {playing ? <Pause /> : <Play />} {playing ? 'Pause' : 'Play'}
      </Button>
      <span className="font-medium tabular-nums">{formatTime(new Date(now).toISOString())}</span>
      <span className="text-muted-foreground tabular-nums">
        {elapsed(now - range.start)} / {elapsed(range.end - range.start)}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          className="text-[13px]"
          disabled={!nextFlag}
          onClick={() => nextFlag && seek(Date.parse(nextFlag.at) - EVENT_LEAD_MS)}
          size="sm"
          type="button"
          variant="outline"
        >
          <Flag /> Next flag
        </Button>
        {SPEEDS.map((speed) => (
          <Button
            className="w-10 text-[12px]"
            key={speed}
            onClick={() => setRate(speed)}
            size="sm"
            type="button"
            variant={rate === speed ? 'default' : 'ghost'}
          >
            {speed}×
          </Button>
        ))}
      </div>
    </div>
  )

  const timeline = range && (
    <div className="flex flex-col gap-1">
      <div className="flex gap-3">
        <div className="flex w-14 shrink-0 flex-col gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex h-5 items-center">Screen</span>
          <span className="flex h-5 items-center">Webcam</span>
          <span className="flex h-5 items-center">Activity</span>
        </div>
        <div
          aria-label="Timeline"
          aria-valuemax={range.end}
          aria-valuemin={range.start}
          aria-valuenow={now}
          className="relative flex min-w-0 flex-1 cursor-pointer flex-col gap-1.5"
          onClick={onTimelineClick}
          role="slider"
          tabIndex={0}
        >
          <Lane clips={screenClips} />
          <Lane clips={webcamClips} />
          <div className="relative h-5">
            {events.map((e) => {
              const at = Date.parse(e.at)
              const title = `${formatTime(e.at)} · ${eventLabels[e.type]}${eventDetail(e) ? ` (${eventDetail(e)})` : ''}`
              return e.durationSeconds ? (
                <span
                  className="absolute top-1 h-3 rounded-sm bg-destructive/40 ring-1 ring-destructive"
                  key={e.id}
                  style={{
                    left: `${pct(at)}%`,
                    width: `${Math.max(0.6, pct(at + e.durationSeconds * 1000) - pct(at))}%`,
                  }}
                  title={title}
                />
              ) : (
                <span
                  className={cn(
                    'absolute top-1.5 size-2 -translate-x-1/2 rounded-full',
                    isFlagged(e.type) ? 'bg-destructive' : 'bg-muted-foreground/60',
                  )}
                  key={e.id}
                  style={{ left: `${pct(at)}%` }}
                  title={title}
                />
              )
            })}
          </div>
          <span
            className="pointer-events-none absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${pct(now)}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between pl-[68px] text-[11px] text-muted-foreground tabular-nums">
        <span>{formatTime(new Date(range.start).toISOString())}</span>
        <span>{formatTime(new Date(range.end).toISOString())}</span>
      </div>
    </div>
  )

  const feed =
    events.length === 0 ? (
      <p className="text-muted-foreground">No activity recorded.</p>
    ) : (
      <ul
        className={cn(
          'relative overflow-y-auto rounded-lg border',
          isPage ? 'max-h-[calc(100vh-260px)] min-h-[320px]' : 'max-h-72',
        )}
        ref={feedRef}
      >
        {events.map((e) => {
          const at = Date.parse(e.at)
          const isCurrent = currentEvent?.id === e.id
          return (
            <li className="border-b last:border-b-0" data-event={e.id} key={e.id}>
              <button
                className={cn(
                  'grid w-full cursor-pointer grid-cols-[88px_48px_1fr] items-center gap-2 border-l-2 border-transparent px-3 py-2 text-left transition-colors hover:bg-muted/60',
                  at > now + 250 && 'opacity-50',
                  isCurrent && 'border-l-foreground bg-muted opacity-100',
                )}
                onClick={() => seek(at - EVENT_LEAD_MS)}
                title="Jump to this moment"
                type="button"
              >
                <span className="tabular-nums">{formatTime(e.at)}</span>
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {range ? elapsed(at - range.start) : ''}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge
                    className="text-[11px]"
                    variant={isFlagged(e.type) ? 'destructive' : 'secondary'}
                  >
                    {eventLabels[e.type]}
                  </Badge>
                  {eventDetail(e) && (
                    <span className="truncate text-[12px] text-muted-foreground">
                      {eventDetail(e)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    )

  const deleteControls = days.length > 0 && (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground">Delete recordings:</span>
      {days.map((day) => (
        <Button
          className="text-[13px]"
          key={day}
          onClick={() => {
            setDeleteDay(day)
            openModal(modalSlug)
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Trash2 /> {formatDay(day)}
        </Button>
      ))}
    </div>
  )

  const confirmModal = (
    <ConfirmationModal
      body={
        deleteDay
          ? `This permanently deletes all screen and webcam recordings from ${formatDay(deleteDay)} for this assessment. The activity log is kept.`
          : ''
      }
      confirmLabel="Delete recordings"
      heading="Delete these recordings?"
      modalSlug={modalSlug}
      onConfirm={confirmDelete}
    />
  )

  if (isPage) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">{summary}</span>
          <span className="ml-auto flex flex-wrap gap-1.5">{flagBadges}</span>
        </div>

        {!range ? (
          <Card className="py-10">
            <p className="text-center text-muted-foreground">No proctoring data yet.</p>
          </Card>
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-4">
              {players}
              {transport}
              {timeline}
            </div>
            <Card className="gap-3 py-4 xl:sticky xl:top-4">
              <CardHeader className="px-4">
                <CardTitle className="text-[15px]">Activity</CardTitle>
                <CardDescription className="text-[12px]">
                  Follows the video. Click an event to jump there.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-4">
                {feed}
                {deleteControls}
              </CardContent>
            </Card>
          </div>
        )}
        {confirmModal}
      </div>
    )
  }

  return (
    <>
      <Card className="gap-5 py-5">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2 text-[16px]">
            <ShieldCheck className="size-4" /> Proctoring review
          </CardTitle>
          <CardDescription className="text-[13px]">{summary}</CardDescription>
          <CardAction className="flex flex-wrap justify-end gap-1.5">
            {reviewHref && (
              <Button asChild className="text-[12px]" size="sm" variant="outline">
                <a href={reviewHref}>
                  <ExternalLink /> Open full review
                </a>
              </Button>
            )}
            {flagBadges}
          </CardAction>
        </CardHeader>

        {!range ? (
          <CardContent className="px-5">
            <p className="py-6 text-center text-muted-foreground">No proctoring data yet.</p>
          </CardContent>
        ) : (
          <CardContent className="flex flex-col gap-5 px-5">
            {players}
            {transport}
            {timeline}
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold">Activity</h3>
              {feed}
            </div>
            {deleteControls && <div className="border-t pt-4">{deleteControls}</div>}
          </CardContent>
        )}
      </Card>
      {confirmModal}
    </>
  )
}
