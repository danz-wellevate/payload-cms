import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { proctoringEventTypes } from '../assessment/events'

// Append-only activity log for an assessment, written by the /assessment/[token] routes.
export const ProctoringEvents: CollectionConfig = {
  slug: 'proctoring-events',
  labels: { singular: 'Proctoring Event', plural: 'Proctoring Events' },
  defaultSort: '-at',
  admin: {
    group: 'Assessments',
    useAsTitle: 'type',
    defaultColumns: ['type', 'assessment', 'at', 'durationSeconds', 'characters'],
  },
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'assessment',
      type: 'relationship',
      relationTo: 'assessments',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [...proctoringEventTypes],
    },
    {
      name: 'at',
      label: 'Time',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'MMM d, h:mm:ss a' } },
    },
    {
      name: 'durationSeconds',
      label: 'Away (seconds)',
      type: 'number',
    },
    {
      name: 'characters',
      label: 'Characters pasted',
      type: 'number',
    },
    {
      name: 'detail',
      type: 'text',
    },
  ],
}
