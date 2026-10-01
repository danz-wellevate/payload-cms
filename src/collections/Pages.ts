import type { CollectionConfig } from 'payload'

import { pageBlocks } from '../blocks/config'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    preview: (doc) => (doc.slug === 'home' ? '/' : `/${doc.slug}`),
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
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
        !value || /^[a-z0-9-]+$/.test(value) || 'Use lowercase letters, numbers and dashes only',
      admin: {
        position: 'sidebar',
        description: 'Use "home" for the homepage. Other pages are served at /<slug>.',
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
