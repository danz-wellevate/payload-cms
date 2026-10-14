import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

export const DEFAULT_MINIMUM_SCORE = 80

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Job postings listed at /careers. The AI resume review compares each resume against the
// Qualifications and Required skills below.
export const Jobs: CollectionConfig = {
  slug: 'jobs',
  labels: { singular: 'Job posting', plural: 'Job postings' },
  admin: {
    group: 'Hiring',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'location', 'minimumScore', 'updatedAt'],
    description: 'Open postings are listed at /careers, where candidates apply with their resume.',
  },
  access: {
    // Anyone can read open postings; only admins see closed ones.
    read: ({ req }) => isAdmin({ req }) || { status: { equals: 'open' } },
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Used in the URL. Generated from the title.' },
      hooks: {
        beforeValidate: [({ value, data }) => slugify(value || data?.title || '')],
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      required: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        { name: 'location', type: 'text' },
        { name: 'employmentType', label: 'Employment type', type: 'text' },
      ],
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: { description: 'A short description shown on the careers page.' },
    },
    {
      name: 'qualifications',
      type: 'textarea',
      required: true,
      admin: {
        description: 'One per line. The AI review checks the resume against each of these.',
        rows: 6,
      },
    },
    {
      name: 'requiredSkills',
      label: 'Required skills',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Skill', plural: 'Skills' },
      fields: [{ name: 'skill', type: 'text', required: true }],
    },
    {
      name: 'minimumScore',
      label: 'Minimum AI score (%)',
      type: 'number',
      defaultValue: DEFAULT_MINIMUM_SCORE,
      min: 0,
      max: 100,
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Candidates at or above this score are invited to book an initial interview.',
      },
    },
    {
      name: 'applications',
      type: 'join',
      collection: 'applications',
      on: 'job',
      admin: {
        allowCreate: false,
        defaultColumns: ['email', 'aiScore', 'stage', 'createdAt'],
      },
    },
  ],
}
