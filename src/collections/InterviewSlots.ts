import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { HIRING_TIME_ZONE } from '../recruitment/format'

// Times the Head of Plus is free for an initial interview. Candidates who pass the AI review
// pick one of the open slots from the link in their email.
export const InterviewSlots: CollectionConfig = {
  slug: 'interview-slots',
  labels: { singular: 'Interview slot', plural: 'Interview slots' },
  admin: {
    group: 'Hiring',
    useAsTitle: 'label',
    defaultColumns: ['startsAt', 'durationMinutes', 'interviewer', 'application'],
    description:
      'Initial interview times candidates can book. A slot is taken once a candidate books it.',
  },
  defaultSort: 'startsAt',
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'startsAt',
          label: 'Starts',
          type: 'date',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'durationMinutes',
          label: 'Length (minutes)',
          type: 'number',
          defaultValue: 30,
          min: 5,
          max: 240,
          required: true,
        },
      ],
    },
    {
      name: 'interviewer',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Optional. Defaults to whoever is Head of Plus.' },
    },
    {
      name: 'meetingLink',
      label: 'Meeting link',
      type: 'text',
      admin: { description: 'Optional. Sent to the candidate when they book.' },
    },
    {
      name: 'application',
      label: 'Booked by',
      type: 'relationship',
      relationTo: 'applications',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Filled in when a candidate books this slot. Clear it to free the slot.',
      },
    },
    {
      // List title, e.g. "Mon, Oct 13, 2026, 10:00 AM".
      name: 'label',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [
          ({ siblingData }) =>
            siblingData?.startsAt
              ? new Date(siblingData.startsAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: HIRING_TIME_ZONE,
                })
              : 'Interview slot',
        ],
      },
    },
  ],
}
