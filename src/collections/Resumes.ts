import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

export const RESUME_MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

export const MAX_RESUME_BYTES = 5 * 1024 * 1024

// Resume files uploaded with applications. Private: only admins can list or download them.
export const Resumes: CollectionConfig = {
  slug: 'resumes',
  labels: { singular: 'Resume', plural: 'Resumes' },
  admin: {
    group: 'Hiring',
    hidden: true,
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    staticDir: 'resumes',
    mimeTypes: Object.values(RESUME_MIME_TYPES),
  },
  fields: [],
}
