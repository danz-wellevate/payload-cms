import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

export const Playground: GlobalConfig = {
  slug: 'playground',
  label: 'Code Playground',
  admin: {
    group: 'Settings',
    description: 'Instructions shown beside the code editor at /playground.',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Instructions',
      required: true,
    },
    {
      name: 'instructions',
      type: 'richText',
      admin: {
        description: 'The task for the user, e.g. the problem statement, input format and rules.',
      },
    },
  ],
}
