import type { PayloadRequest } from 'payload'

// Wipes an attempt so the candidate can take the exam again with the same invite link:
// deletes its activity events, webcam recordings and snapshots (and their files) and clears every
// submission, timing, review and integrity field.
export const resetAssessment = async (req: PayloadRequest, id: number | string) => {
  const { payload } = req

  await payload.delete({
    collection: 'proctoring-events',
    where: { assessment: { equals: id } },
    req,
  })
  await payload.delete({
    collection: 'proctoring-recordings',
    where: { assessment: { equals: id } },
    req,
  })
  await payload.delete({
    collection: 'proctoring-snapshots',
    where: { assessment: { equals: id } },
    req,
  })

  return payload.update({
    collection: 'assessments',
    id,
    req,
    data: {
      status: 'invited',
      result: 'pending',
      feedback: null,
      startedAt: null,
      completedAt: null,
      endedBy: null,
      submittedLate: false,
      code: null,
      languageId: null,
      languageLabel: null,
      finalRun: {
        status: null,
        time: null,
        memory: null,
        stdin: null,
        stdout: null,
        errors: null,
      },
      tabSwitches: 0,
      timeAwaySeconds: 0,
      fullscreenExits: 0,
      pastes: 0,
      pastedCharacters: 0,
      codeRuns: 0,
      multipleMonitors: false,
    },
  })
}
