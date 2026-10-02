import type { Payload, PayloadRequest, Where } from 'payload'

// Webcam recordings (and older snapshots) are deleted automatically after this many days.
export const CAPTURE_RETENTION_DAYS = Number(process.env.CAPTURE_RETENTION_DAYS) || 30

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000

type Range = { from: Date; to: Date; assessment?: number | string }

const within = (field: string, { from, to, assessment }: Range): Where => ({
  and: [
    { [field]: { greater_than_equal: from.toISOString() } },
    { [field]: { less_than: to.toISOString() } },
    ...(assessment != null ? [{ assessment: { equals: assessment } }] : []),
  ],
})

// Deletes recordings and snapshots captured in [from, to), optionally for one assessment.
// Deleting the documents also removes their files from disk.
export const deleteCapturesBetween = async (
  payload: Payload,
  range: Range,
  req?: PayloadRequest,
) => {
  const [recordings, snapshots] = await Promise.all([
    payload.delete({
      collection: 'proctoring-recordings',
      where: within('startedAt', range),
      overrideAccess: true,
      req,
    }),
    payload.delete({
      collection: 'proctoring-snapshots',
      where: within('takenAt', range),
      overrideAccess: true,
      req,
    }),
  ])
  return { recordings: recordings.docs.length, snapshots: snapshots.docs.length }
}

export const deleteExpiredCaptures = async (payload: Payload) => {
  const to = new Date(Date.now() - CAPTURE_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const deleted = await deleteCapturesBetween(payload, { from: new Date(0), to })
  if (deleted.recordings || deleted.snapshots) {
    payload.logger.info(
      `Deleted ${deleted.recordings} recordings and ${deleted.snapshots} snapshots older than ${CAPTURE_RETENTION_DAYS} days`,
    )
  }
  return deleted
}

// Runs the retention cleanup now and every few hours while the server is up.
export const scheduleCaptureCleanup = (payload: Payload) => {
  const run = () =>
    deleteExpiredCaptures(payload).catch((err) =>
      payload.logger.error({ err, msg: 'Capture cleanup failed' }),
    )
  void run()
  setInterval(run, CLEANUP_INTERVAL_MS).unref()
}
