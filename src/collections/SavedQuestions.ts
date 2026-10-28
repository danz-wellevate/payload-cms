import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

// A reusable question (prompt + expected output + optional test input). Pick one inside an
// assessment's Tasks list instead of re-typing it for every applicant. When an assessment is
// saved, the saved question's content is COPIED into the task, so editing a saved question later
// never changes assessments that already used it (until you re-pick it there).
export const SavedQuestions: CollectionConfig = {
  slug: 'saved-questions',
  labels: { singular: 'Saved Question', plural: 'Saved Questions' },
  admin: {
    group: 'Assessments',
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
    description:
      'Your question library. Save a task here with the bookmark button inside an assessment, or create one directly. Reuse it in any assessment from the Tasks list.',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Shown as the task title when you reuse this question.' },
    },
    {
      name: 'prompt',
      label: 'Question / instructions',
      type: 'richText',
      required: true,
    },
    {
      name: 'testInput',
      label: 'Test input (optional)',
      type: 'textarea',
      admin: {
        description:
          "Optional. If the program reads input, put it here — it's used when checking the output.",
      },
    },
    {
      name: 'acceptedAnswers',
      label: 'Expected output',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Accepted output', plural: 'Accepted outputs' },
      admin: {
        description:
          "The candidate passes when their program's output matches ANY of these. Never shown to the candidate.",
      },
      fields: [{ name: 'answer', label: 'Output', type: 'textarea', required: true }],
    },
    {
      name: 'caseSensitive',
      label: 'Case sensitive',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}
