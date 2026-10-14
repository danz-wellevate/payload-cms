import type { Payload } from 'payload'

export const findApplicationByToken = async (payload: Payload, token: string) => {
  if (!/^[\w-]{16,64}$/.test(token)) return null
  const { docs } = await payload.find({
    collection: 'applications',
    where: { schedulingToken: { equals: token } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

// Open slots candidates can book: in the future and not taken.
export const findOpenSlots = (payload: Payload) =>
  payload.find({
    collection: 'interview-slots',
    where: {
      and: [
        { startsAt: { greater_than: new Date().toISOString() } },
        { application: { exists: false } },
      ],
    },
    sort: 'startsAt',
    limit: 100,
    depth: 0,
  })
