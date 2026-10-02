import type { Payload, Where } from 'payload'

import { ArrowRight, CircleCheck, CircleX, Hourglass, PlayCircle, Users } from 'lucide-react'
import React from 'react'

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import '@/styles/shadcn.css'

const awaitingReview: Where = {
  and: [{ status: { equals: 'completed' } }, { result: { equals: 'pending' } }],
}

// Turns a Where into the list view's ?where[...] query string.
const toQuery = (where: Where, prefix = 'where'): string[] =>
  Object.entries(where).flatMap(([key, value]) =>
    Array.isArray(value)
      ? value.flatMap((item, i) => toQuery(item as Where, `${prefix}[${key}][${i}]`))
      : typeof value === 'object' && value !== null
        ? toQuery(value as Where, `${prefix}[${key}]`)
        : [`${encodeURIComponent(`${prefix}[${key}]`)}=${encodeURIComponent(String(value))}`],
  )

// Coding exam summary shown above the collections on the admin dashboard (beforeDashboard).
export const ExamOverview = async ({ payload }: { payload: Payload }) => {
  const admin = payload.config.routes.admin
  const listUrl = (collection: string, where?: Where) =>
    `${admin}/collections/${collection}${where ? `?${toQuery(where).join('&')}` : ''}`

  const count = async (where: Where) =>
    (await payload.count({ collection: 'assessments', where })).totalDocs

  const [applicants, inProgress, toReview, passed, failed, queue] = await Promise.all([
    payload.count({ collection: 'applicants' }).then((r) => r.totalDocs),
    count({ status: { equals: 'in_progress' } }),
    count(awaitingReview),
    count({ result: { equals: 'passed' } }),
    count({ result: { equals: 'failed' } }),
    payload.find({
      collection: 'assessments',
      where: awaitingReview,
      sort: 'completedAt',
      limit: 5,
      depth: 0,
    }),
  ])

  const stats = [
    { label: 'Applicants', value: applicants, icon: Users, href: listUrl('applicants') },
    {
      label: 'In progress',
      value: inProgress,
      icon: PlayCircle,
      href: listUrl('assessments', { status: { equals: 'in_progress' } }),
    },
    {
      label: 'Awaiting review',
      value: toReview,
      icon: Hourglass,
      href: listUrl('assessments', awaitingReview),
      highlight: toReview > 0,
    },
    {
      label: 'Passed',
      value: passed,
      icon: CircleCheck,
      href: listUrl('assessments', { result: { equals: 'passed' } }),
    },
    {
      label: 'Failed',
      value: failed,
      icon: CircleX,
      href: listUrl('assessments', { result: { equals: 'failed' } }),
    },
  ]

  return (
    <section className="shadcn shadcn-admin mb-10 flex flex-col gap-4 text-[13px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[26px] font-medium tracking-tight">Coding exam</h2>
          <p className="text-[13px] text-muted-foreground">
            Applicants and submissions at a glance.
          </p>
        </div>
        <Button asChild className="text-[13px]" size="sm" variant="outline">
          <a href={listUrl('assessments')}>
            All assessments <ArrowRight />
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, href, highlight }) => (
          <a className="group text-inherit no-underline" href={href} key={label}>
            <Card className="h-full gap-2 py-5 transition-colors group-hover:bg-muted/50">
              <CardHeader className="px-5">
                <CardDescription className="text-[13px] font-medium">{label}</CardDescription>
                <CardAction>
                  <Icon className="size-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent className="px-5">
                <span className="flex items-center gap-2 text-[30px] leading-none font-semibold tabular-nums">
                  {value}
                  {highlight && (
                    <span className="size-2 rounded-full bg-amber-500" title="Needs attention" />
                  )}
                </span>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-[16px]">Needs review</CardTitle>
          <CardDescription className="text-[13px]">
            Submitted exams without a result, oldest first. Open one to review the code and set
            Passed or Failed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queue.docs.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              All caught up — nothing is waiting for review.
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Left tab</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.docs.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{exam.candidateName}</div>
                      <div className="text-[12px] text-muted-foreground">{exam.candidateEmail}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {exam.completedAt ? <LocalTime value={exam.completedAt} /> : '—'}
                      {exam.endedBy === 'time_expired' && (
                        <Badge className="ml-2 text-[11px]" variant="outline">
                          Timed out
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{exam.languageLabel ?? '—'}</TableCell>
                    <TableCell>
                      {exam.tabSwitches ? (
                        <Badge
                          className="text-[11px]"
                          variant={exam.tabSwitches >= 3 ? 'destructive' : 'secondary'}
                        >
                          {exam.tabSwitches}×
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild className="text-[13px]" size="sm" variant="outline">
                        <a href={`${admin}/collections/assessments/${exam.id}/review`}>Review</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
