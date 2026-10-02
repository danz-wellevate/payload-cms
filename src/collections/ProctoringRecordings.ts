import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { CAPTURE_RETENTION_DAYS, deleteCapturesBetween } from '../assessment/captures'

// Webcam and screen video recorded during an assessment, saved as ~1 minute clips so nothing is lost if
// the candidate's browser closes. Files are only served to logged-in admins.
export const ProctoringRecordings: CollectionConfig = {
  slug: 'proctoring-recordings',
  labels: { singular: 'Recording', plural: 'Recordings' },
  defaultSort: '-startedAt',
  admin: {
    group: 'Assessments',
    defaultColumns: ['filename', 'source', 'assessment', 'startedAt', 'durationSeconds', 'filesize'],
    description: `Recordings are deleted automatically after ${CAPTURE_RETENTION_DAYS} days.`,
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
    staticDir: 'proctoring-recordings',
    mimeTypes: ['video/webm', 'video/mp4'],
  },
  endpoints: [
    {
      // POST /api/proctoring-recordings/delete-range { from, to, assessment? }
      // Deletes recordings and snapshots captured in [from, to). Used by "Delete by date".
      path: '/delete-range',
      method: 'post',
      handler: async (req) => {
        if (!isAdmin({ req })) return Response.json({ error: 'Forbidden' }, { status: 403 })

        const body = await req.json?.().catch(() => null)
        const from = new Date(body?.from)
        const to = new Date(body?.to)
        if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
          return Response.json({ error: 'Choose a valid date.' }, { status: 400 })
        }

        const deleted = await deleteCapturesBetween(
          req.payload,
          { from, to, assessment: body?.assessment ?? undefined },
          req,
        )
        return Response.json(deleted)
      },
    },
  ],
  fields: [
    {
      name: 'assessment',
      type: 'relationship',
      relationTo: 'assessments',
      required: true,
      index: true,
    },
    {
      // Optional (no default) so adding it is a plain column add; empty means webcam.
      name: 'source',
      type: 'select',
      options: [
        { label: 'Webcam', value: 'webcam' },
        { label: 'Screen', value: 'screen' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startedAt',
          type: 'date',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'MMM d, h:mm:ss a' } },
        },
        {
          name: 'endedAt',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'MMM d, h:mm:ss a' } },
        },
        { name: 'durationSeconds', label: 'Length (s)', type: 'number' },
      ],
    },
  ],
}
