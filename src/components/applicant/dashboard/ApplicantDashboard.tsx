import {
  AppWindow,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Camera,
  CircleCheck,
  CircleX,
  Code,
  Hourglass,
  LogOut,
  Maximize,
  Monitor,
  MessageSquare,
  Send,
  Timer,
} from 'lucide-react'
import React from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { LocalTime } from '../LocalTime'

export type ExamState = 'not_started' | 'in_progress' | 'awaiting_review' | 'passed' | 'failed'

export type ApplicantDashboardProps = {
  name: string
  email: string
  state: ExamState
  timeLimit: string
  minutesLeft?: number | null
  startedAt?: string | null
  completedAt?: string | null
  timedOut?: boolean
  language?: string | null
  feedback?: string | null
}

const badges: Record<ExamState, React.ReactNode> = {
  not_started: <Badge variant="secondary">Not started</Badge>,
  in_progress: (
    <Badge>
      <span className="size-1.5 animate-pulse rounded-full bg-current" /> In progress
    </Badge>
  ),
  awaiting_review: (
    <Badge variant="outline">
      <Hourglass /> Awaiting review
    </Badge>
  ),
  passed: (
    <Badge variant="success">
      <CircleCheck /> Passed
    </Badge>
  ),
  failed: (
    <Badge variant="destructive">
      <CircleX /> Failed
    </Badge>
  ),
}

const descriptions: Record<ExamState, string> = {
  not_started: 'Solve the coding exercise in the browser-based editor.',
  in_progress: 'Your exam is in progress and the timer is still running.',
  awaiting_review: 'Your submission was received and is being reviewed.',
  passed: 'Congratulations, you passed the coding exam.',
  failed: 'Thank you for taking the coding exam.',
}

const rules = [
  { icon: Timer, text: 'The timer starts when you click Start test.' },
  { icon: Maximize, text: 'The exam runs in full screen.' },
  { icon: Camera, text: 'Your webcam is recorded on video during the exam.' },
  { icon: Monitor, text: 'You share your entire screen, and it is recorded.' },
  { icon: AppWindow, text: 'Leaving the exam tab or window is recorded.' },
  { icon: Send, text: 'Click Done / Submit when finished, or it submits when time runs out.' },
]

const Fact = ({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) => (
  <div className="rounded-lg border bg-muted/50 p-4">
    <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="size-3.5" /> {label}
    </dt>
    <dd className="mt-1 text-sm font-semibold text-foreground">{children}</dd>
  </div>
)

export const ApplicantDashboard = ({
  name,
  email,
  state,
  timeLimit,
  minutesLeft,
  startedAt,
  completedAt,
  timedOut,
  language,
  feedback,
}: ApplicantDashboardProps) => {
  const canStart = state === 'not_started' || state === 'in_progress'
  const reviewed = state === 'passed' || state === 'failed'

  return (
    <div className="shadcn mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            Applicant dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Hi {name}</h1>
          <p className="text-sm text-muted-foreground">Signed in as {email}</p>
        </div>
        <form action="/applicant/auth/logout" method="post">
          <Button type="submit" variant="outline">
            <LogOut /> Log out
          </Button>
        </form>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Coding exam</CardTitle>
          <CardDescription>{descriptions[state]}</CardDescription>
          <CardAction>{badges[state]}</CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact icon={Timer} label="Time limit">
              {timeLimit}
            </Fact>
            {state === 'in_progress' && minutesLeft != null && (
              <Fact icon={Hourglass} label="Time left">
                About {minutesLeft} min
              </Fact>
            )}
            {startedAt && (
              <Fact icon={CalendarClock} label="Started">
                <LocalTime value={startedAt} />
              </Fact>
            )}
            {completedAt && (
              <Fact icon={CalendarCheck} label="Submitted">
                <LocalTime value={completedAt} />
                {timedOut && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    Time limit reached
                  </span>
                )}
              </Fact>
            )}
            {language && !canStart && (
              <Fact icon={Code} label="Language">
                {language}
              </Fact>
            )}
          </dl>

          {reviewed && feedback && (
            <Alert variant={state === 'passed' ? 'success' : 'destructive'}>
              <MessageSquare />
              <AlertTitle>Feedback from the reviewer</AlertTitle>
              <AlertDescription className="whitespace-pre-line">{feedback}</AlertDescription>
            </Alert>
          )}

          {state === 'awaiting_review' && (
            <Alert>
              <Hourglass />
              <AlertTitle>Submission received</AlertTitle>
              <AlertDescription>
                Your code is being reviewed. Check back here for your result.
              </AlertDescription>
            </Alert>
          )}

          {state === 'not_started' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">Before you start</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {rules.map(({ icon: Icon, text }) => (
                  <li
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm text-muted-foreground"
                    key={text}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>

        {canStart && (
          <CardFooter className="border-t">
            <form action="/applicant/exam" method="post">
              <Button size="lg" type="submit">
                {state === 'in_progress' ? 'Resume exam' : 'Start coding exam'} <ArrowRight />
              </Button>
            </form>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
