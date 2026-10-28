import type { PayloadRequest } from 'payload'

// Wipes an attempt so the candidate can take the exam again with the same invite link:
// deletes its activity events, webcam recordings and snapshots (and their files) and clears every
// submission, timing, review, task-progress and integrity field.
// Multi-task progress: the candidate starts again at task 1 and the saved per-task results are
// cleared. Kept in a variable so TypeScript doesn't reject the new fields while payload-types.ts is
// out of date; after `payload generate:types` these can be written inline again.
const taskProgressReset = { currentTaskIndex: 0, wrongAnswers: 0, taskResults: [] }

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
      ...taskProgressReset,
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
