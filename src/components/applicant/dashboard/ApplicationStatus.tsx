import { ArrowRight, Check } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type ApplicationStatusProps = {
  jobTitle: string
  stage: string
  schedulingHref?: string | null
  initialInterviewAt?: string | null
  technicalAssessmentAt?: string | null
  finalInterviewAt?: string | null
  finalInterviewDetails?: string | null
}

const steps = ['Applied', 'Initial interview', 'Technical assessment', 'Final interview']

// Which step is current (0-3) and whether the application ended there.
const progress = (stage: string): { step: number; ended?: boolean } => {
  switch (stage) {
    case 'invited_to_schedule':
    case 'initial_scheduled':
      return { step: 1 }
    case 'initial_failed':
      return { step: 1, ended: true }
    case 'initial_passed':
    case 'assessment_scheduled':
    case 'assessment_in_progress':
    case 'assessment_submitted':
      return { step: 2 }
    case 'assessment_failed':
      return { step: 2, ended: true }
    case 'assessment_passed':
    case 'final_scheduled':
      return { step: 3 }
    default:
      return { step: 0 }
  }
}

export const ApplicationStatus = ({
  jobTitle,
  stage,
  schedulingHref,
  initialInterviewAt,
  technicalAssessmentAt,
  finalInterviewAt,
  finalInterviewDetails,
}: ApplicationStatusProps) => {
  const { step, ended } = progress(stage)

  // Candidates only see neutral wording until a person has made a decision.
  const message: Record<string, React.ReactNode> = {
    invited_to_schedule: 'Good news: we would like to meet you. Book your initial interview.',
    initial_scheduled: <>Your initial interview is on {initialInterviewAt}.</>,
    initial_failed: 'Thank you for interviewing with us. We will not be moving forward this time.',
    initial_passed:
      'You passed the initial interview. We will email you your technical assessment schedule.',
    assessment_scheduled: (
      <>
        Your technical assessment is on {technicalAssessmentAt}. The Start button below appears at
        that time.
      </>
    ),
    assessment_in_progress: 'Your technical assessment is in progress.',
    assessment_submitted: 'Your technical assessment was submitted and is being reviewed.',
    assessment_failed:
      'Thank you for taking the technical assessment. We will not be moving forward this time.',
    assessment_passed:
      'You passed the technical assessment. We will email you your final interview schedule.',
    final_scheduled: (
      <>
        Your final interview is on {finalInterviewAt}.
        {finalInterviewDetails && (
          <span className="mt-1 block whitespace-pre-line">{finalInterviewDetails}</span>
        )}
      </>
    ),
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-xl">Your application</CardTitle>
        <CardDescription>{jobTitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ol className="grid gap-3 sm:grid-cols-4">
          {steps.map((label, i) => {
            const done = i < step
            const current = i === step
            return (
              <li className="flex items-center gap-2.5 text-sm" key={label}>
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                    done && 'border-primary bg-primary text-primary-foreground',
                    current && !ended && 'border-primary text-primary',
                    current && ended && 'border-destructive text-destructive',
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    current ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </li>
            )
          })}
        </ol>

        <p className="rounded-lg border bg-muted/50 p-4 text-sm">
          {message[stage] ??
            'We received your application and are reviewing your resume. We will email you about the next step.'}
        </p>

        {stage === 'invited_to_schedule' && schedulingHref && (
          <Button asChild className="self-start" size="lg">
            <a href={schedulingHref}>
              Book your initial interview <ArrowRight />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
