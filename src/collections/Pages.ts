import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { pageBlocks } from '../blocks/config'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    preview: (doc) => (doc.slug === 'home' ? '/' : `/${doc.slug}`),
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (value: string | null | undefined) =>
        (!!value && /^[a-z0-9-]+$/.test(value)) ||
        'Enter a slug using lowercase letters, numbers and dashes only',
      admin: {
        position: 'sidebar',
        description:
          'Generated from the title. Use "home" for the homepage; other pages are served at /<slug>.',
      },
      hooks: {
        beforeValidate: [({ value, data }) => slugify(value || data?.title || '')],
      },
    },
    {
      name: 'layout',
      label: 'Sections',
      type: 'blocks',
      blocks: pageBlocks,
    },
  ],
}
