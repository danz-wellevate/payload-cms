import type { GlobalConfig } from 'payload'

import { linkFields } from '../fields/link'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Main Menu',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      labels: { singular: 'Menu Item', plural: 'Menu Items' },
      fields: [
        ...linkFields,
        {
          name: 'children',
          type: 'array',
          label: 'Submenu',
          fields: linkFields,
        },
      ],
    },
  ],
}
