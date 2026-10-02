import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { linkFields } from '../fields/link'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'columns',
      type: 'array',
      labels: { singular: 'Menu Column', plural: 'Menu Columns' },
      fields: [
        {
          name: 'heading',
          type: 'text',
        },
        {
          name: 'links',
          type: 'array',
          fields: linkFields,
        },
      ],
    },
    {
      name: 'copyright',
      type: 'text',
      admin: {
        description: 'e.g. © 2026 My Company. All rights reserved.',
      },
    },
  ],
}
