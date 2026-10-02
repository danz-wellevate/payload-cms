import type { CollectionBeforeValidateHook } from 'payload'

import { ValidationError } from 'payload'

// Admin (`users`) and applicant accounts must never share an email address, so an applicant
// can't sign up with an admin's email (and an admin can't be created with an applicant's).
export const rejectEmailUsedBy =
  (otherCollection: 'users' | 'applicants', message: string): CollectionBeforeValidateHook =>
  async ({ collection, data, originalDoc, req }) => {
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : undefined
    if (!email || email === originalDoc?.email?.toLowerCase()) return data

    const { totalDocs } = await req.payload.count({
      collection: otherCollection,
      where: { email: { equals: email } },
      overrideAccess: true,
      req,
    })
    if (totalDocs > 0) {
      throw new ValidationError({
        collection: collection.slug,
        errors: [{ message, path: 'email' }],
        req,
      })
    }
    return data
  }
