'use client'

import { useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React from 'react'

import '@/styles/shadcn.css'

import { ProctoringPlayer } from './review/ProctoringPlayer'

// Assessment → Proctoring tab: the synced review in compact form, linking to the full Review page.
export const ProctoringReview = () => {
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { admin },
    },
  } = useConfig()
  const examStart = useFormFields(([f]) => f.startedAt?.value as string | undefined)
  const examEnd = useFormFields(([f]) => f.completedAt?.value as string | undefined)

  if (!id) return null

  return (
    <div className="shadcn shadcn-admin mb-8 text-[13px]">
      <ProctoringPlayer
        assessmentId={id}
        examEnd={examEnd}
        examStart={examStart}
        layout="panel"
        reviewHref={`${admin}/collections/assessments/${id}/review`}
      />
    </div>
  )
}
