import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { CAPTURE_RETENTION_DAYS } from '../assessment/captures'

// Webcam snapshots taken during an assessment. Files are only served to logged-in admins.
export const ProctoringSnapshots: CollectionConfig = {
  slug: 'proctoring-snapshots',
  labels: { singular: 'Webcam Snapshot', plural: 'Webcam Snapshots' },
  defaultSort: '-takenAt',
  admin: {
    group: 'Assessments',
    defaultColumns: ['filename', 'assessment', 'takenAt'],
    description: `Older webcam snapshots. Deleted automatically after ${CAPTURE_RETENTION_DAYS} days.`,
    components: {
      beforeListTable: ['/components/admin/DeleteCapturesByDate#DeleteCapturesByDate'],
    },
  },
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: isAdmin,
  },
  upload: {
    staticDir: 'proctoring-snapshots',
    mimeTypes: ['image/jpeg'],
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
      name: 'takenAt',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'MMM d, h:mm:ss a' } },
    },
  ],
}
