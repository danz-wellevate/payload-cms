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
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'admin',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Head of Plus', value: 'head_of_plus' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Head of Plus users get the hiring emails (booked interviews, finished assessments). If nobody has this role, every admin gets them.',
      },
    },
  ],
}
