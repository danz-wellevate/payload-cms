import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { rejectEmailUsedBy } from '../hooks/rejectEmailUsedBy'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  hooks: {
    beforeValidate: [
      rejectEmailUsedBy(
        'applicants',
        'This email belongs to an applicant. Use a different email for admins.',
      ),
    ],
  },
  // Admin accounts only. Explicit so logged-in applicants can't read or edit them.
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
