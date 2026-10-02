import { NextResponse } from 'next/server'

import type { ClientEvent } from '@/assessment/events'

import { clientEventTypes } from '@/assessment/events'
import { loadActiveAssessment, logEvent } from '@/assessment/server'
import { findLanguage } from '@/playground/languages'

type Args = { params: Promise<{ token: string }> }

const MAX_EVENTS = 50
const MAX_CODE_LENGTH = 64 * 1024

const toCount = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(Math.round(value), 1_000_000)
    : undefined

// Receives batched proctoring events plus an autosave of the candidate's code.
// Also called via navigator.sendBeacon when the page is closed.
export async function POST(request: Request, { params }: Args) {
  const { token } = await params
  const loaded = await loadActiveAssessment(token)
  if ('error' in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status })
  const { payload, assessment } = loaded

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const received: Partial<ClientEvent>[] = Array.isArray(body.events) ? body.events : []
  const events = received
    .slice(0, MAX_EVENTS)
    .filter((e) => e && clientEventTypes.includes(e.type!))
    .map((e) => {
      const at = new Date(typeof e.at === 'string' ? e.at : Date.now())
      return {
        type: e.type!,
        at: (isNaN(at.getTime()) || at.getTime() > Date.now() ? new Date() : at).toISOString(),
        durationSeconds: toCount(e.durationSeconds),
        characters: toCount(e.characters),
        // e.g. the Judge0 status of a code run
        detail: typeof e.detail === 'string' ? e.detail.slice(0, 120) : undefined,
      }
    })

  for (const event of events) {
    await logEvent(payload, assessment, event.type, event)
  }

  const count = (...types: string[]) => events.filter((e) => types.includes(e.type)).length
  const sum = (key: 'durationSeconds' | 'characters', type: string) =>
    events.filter((e) => e.type === type).reduce((total, e) => total + (e[key] ?? 0), 0)

  const data: Record<string, unknown> = {
    tabSwitches: (assessment.tabSwitches ?? 0) + count('left_tab', 'lost_focus'),
    timeAwaySeconds:
      (assessment.timeAwaySeconds ?? 0) +
      sum('durationSeconds', 'left_tab') +
      sum('durationSeconds', 'lost_focus'),
    fullscreenExits: (assessment.fullscreenExits ?? 0) + count('fullscreen_exit'),
    pastes: (assessment.pastes ?? 0) + count('paste'),
    pastedCharacters: (assessment.pastedCharacters ?? 0) + sum('characters', 'paste'),
    codeRuns: (assessment.codeRuns ?? 0) + count('code_run'),
  }
  if (count('multiple_monitors')) data.multipleMonitors = true

  // Autosave
  const language = typeof body.languageId === 'number' ? findLanguage(body.languageId) : undefined
  if (typeof body.code === 'string' && body.code.length <= MAX_CODE_LENGTH && language) {
    data.code = body.code
    data.languageId = language.id
    data.languageLabel = language.label
  }

  await payload.update({ collection: 'assessments', id: assessment.id, data })

  return NextResponse.json({ ok: true })
}
