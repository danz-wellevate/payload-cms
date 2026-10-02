import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Blog Post', plural: 'Blog Posts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', 'updatedAt'],
    preview: (doc) => `/blog/${doc.slug}`,
  },
  defaultSort: '-publishedAt',
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
      name: 'excerpt',
      type: 'textarea',
      admin: { description: 'Short summary shown on blog cards.' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional. Cards show a themed placeholder when empty.' },
    },
    {
      name: 'content',
      type: 'richText',
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
        description: 'URL: /blog/<slug>',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'MMM d, yyyy' },
      },
    },
    {
      name: 'category',
      type: 'text',
      admin: { position: 'sidebar', placeholder: 'e.g. Design' },
    },
    {
      name: 'authorName',
      label: 'Author',
      type: 'text',
      admin: { position: 'sidebar' },
    },
  ],
}
