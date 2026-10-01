import type { Field } from 'payload'

export const linkFields: Field[] = [
  {
    type: 'row',
    fields: [
      {
        name: 'label',
        type: 'text',
        required: true,
      },
      {
        name: 'url',
        type: 'text',
        required: true,
        admin: {
          description: 'e.g. /about or https://example.com',
        },
      },
    ],
  },
  {
    name: 'newTab',
    type: 'checkbox',
    label: 'Open in new tab',
    defaultValue: false,
  },
]
