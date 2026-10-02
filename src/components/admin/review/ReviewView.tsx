import type { DocumentViewServerProps } from 'payload'

import { Code, PencilLine } from 'lucide-react'
import React from 'react'

import type { Assessment } from '@/payload-types'

import { formatMinutes } from '@/assessment/events'
import { LocalTime } from '@/components/applicant/LocalTime'
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
import '@/styles/shadcn.css'

import { ProctoringPlayer } from './ProctoringPlayer'

const statusLabels: Record<Assessment['status'], string> = {
  invited: 'Invited',
  in_progress: 'In progress',
  completed: 'Completed',
}

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-[120px] flex-col gap-0.5">
    <dt className="text-[11px] text-muted-foreground">{label}</dt>
    <dd className="m-0 font-medium">{children}</dd>
  </div>
)

// Assessments → Review tab (/admin/collections/assessments/:id/review): everything needed to
// judge an applicant on one page — synced screen + webcam recordings, the activity feed that
// follows playback, and the submitted code.
export const ReviewView = ({ doc, initPageResult }: DocumentViewServerProps) => {
  const assessment = doc as Assessment | undefined
  const { req } = initPageResult
  const adminRoute = req.payload.config.routes.admin

  if (!assessment?.id || req.user?.collection !== 'users') {
    return <p className="p-8">This review isn&apos;t available.</p>
  }

  const editHref = `${adminRoute}/collections/assessments/${assessment.id}`
  const run = assessment.finalRun

  return (
    <div className="shadcn shadcn-admin flex flex-col gap-5 px-[var(--gutter-h)] pt-5 pb-16 text-[13px]">
      {/* Applicant at a glance */}
      <Card className="gap-4 py-4">
        <CardHeader className="px-5">
          <CardTitle className="flex flex-wrap items-center gap-2 text-[18px]">
            {assessment.candidateName}
            <Badge className="text-[11px]" variant="secondary">
              {statusLabels[assessment.status]}
            </Badge>
            {assessment.result === 'passed' && (
              <Badge className="text-[11px]" variant="success">
                Passed
              </Badge>
            )}
            {assessment.result === 'failed' && (
              <Badge className="text-[11px]" variant="destructive">
                Failed
              </Badge>
            )}
            {assessment.result === 'pending' && assessment.status === 'completed' && (
              <Badge className="text-[11px]" variant="outline">
                Awaiting review
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-[13px]">{assessment.candidateEmail}</CardDescription>
          <CardAction>
            <Button asChild className="text-[13px]" size="sm">
              <a href={editHref}>
                <PencilLine /> Set result
              </a>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-5">
          <dl className="m-0 flex flex-wrap gap-x-8 gap-y-3">
            <Fact label="Time limit">{formatMinutes(assessment.durationMinutes)}</Fact>
            <Fact label="Started">
              {assessment.startedAt ? <LocalTime value={assessment.startedAt} /> : '—'}
            </Fact>
            <Fact label="Submitted">
              {assessment.completedAt ? <LocalTime value={assessment.completedAt} /> : '—'}
              {assessment.endedBy === 'time_expired' && (
                <span className="text-muted-foreground"> (time ran out)</span>
              )}
            </Fact>
            <Fact label="Language">{assessment.languageLabel ?? '—'}</Fact>
            <Fact label="Left tab / window">
              {assessment.tabSwitches ?? 0}× · {assessment.timeAwaySeconds ?? 0}s away
            </Fact>
            <Fact label="Full-screen exits">{assessment.fullscreenExits ?? 0}</Fact>
            <Fact label="Pastes">
              {assessment.pastes ?? 0} ({assessment.pastedCharacters ?? 0} chars)
            </Fact>
            <Fact label="Code runs">{assessment.codeRuns ?? 0}</Fact>
            {assessment.multipleMonitors && <Fact label="Monitors">Multiple detected</Fact>}
          </dl>
        </CardContent>
      </Card>

      {/* Screen + webcam + activity, all on one clock */}
      <ProctoringPlayer
        assessmentId={assessment.id}
        examEnd={assessment.completedAt}
        examStart={assessment.startedAt}
        layout="page"
      />

      {/* What they submitted */}
      <Card className="gap-4 py-4">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Code className="size-4" /> Submission
          </CardTitle>
          <CardDescription className="text-[12px]">
            {assessment.code
              ? `${assessment.languageLabel ?? 'Code'}${assessment.status === 'completed' ? '' : ' · autosaved, not submitted yet'}`
              : 'Nothing submitted yet.'}
          </CardDescription>
        </CardHeader>
        {assessment.code && (
          <CardContent className="grid gap-4 px-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <pre className="m-0 max-h-[480px] overflow-auto rounded-lg border bg-muted/50 p-4 font-mono text-[12px] leading-relaxed">
              {assessment.code}
            </pre>
            <div className="flex flex-col gap-3">
              <p className="m-0 font-medium">
                Result of the submitted code
                {run?.status && (
                  <Badge
                    className="ml-2 text-[11px]"
                    variant={run.status === 'Accepted' ? 'success' : 'destructive'}
                  >
                    {run.status}
                  </Badge>
                )}
              </p>
              {run?.status ? (
                <>
                  {run.stdin && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-muted-foreground">Input</span>
                      <pre className="m-0 overflow-auto rounded-md border p-2 font-mono text-[12px]">
                        {run.stdin}
                      </pre>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">Output</span>
                    <pre className="m-0 max-h-48 overflow-auto rounded-md border p-2 font-mono text-[12px]">
                      {run.stdout || '(no output)'}
                    </pre>
                  </div>
                  {run.errors && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-muted-foreground">Errors</span>
                      <pre className="m-0 max-h-48 overflow-auto rounded-md border border-destructive/40 p-2 font-mono text-[12px] text-destructive">
                        {run.errors}
                      </pre>
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {run.time ? `${run.time}s` : ''}
                    {run.memory ? ` · ${run.memory} KB` : ''}
                  </span>
                </>
              ) : (
                <p className="m-0 text-muted-foreground">Not run yet.</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
