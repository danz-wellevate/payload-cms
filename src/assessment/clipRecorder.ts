// Records a webcam or screen stream as back-to-back clips (each a standalone, playable video file)
// and uploads them one at a time. If the browser closes, at most the current clip is lost.
export const RECORDING_CLIP_MS = 60_000

const MIME_TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
// Webcam: ~250 kbps at 640×480 ≈ 1–2 MB/min. Screen: ~400 kbps at 720p/5 fps ≈ 3 MB/min.
export const WEBCAM_BITS_PER_SECOND = 250_000
export const SCREEN_BITS_PER_SECOND = 400_000
const RETRY_MS = 2_000

export type UploadClip = (clip: Blob, startedAt: Date, endedAt: Date) => Promise<void>

export type ClipRecorder = {
  // Stops recording and resolves once every clip has been uploaded.
  stop: () => Promise<void>
}

export const startClipRecorder = (
  stream: MediaStream,
  upload: UploadClip,
  videoBitsPerSecond = WEBCAM_BITS_PER_SECOND,
): ClipRecorder | null => {
  if (typeof MediaRecorder === 'undefined') return null
  const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
  if (!mimeType) return null

  let stopping: Promise<void> | null = null
  let current: (MediaRecorder & { endOnPurpose: () => void }) | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let uploads = Promise.resolve()

  const recordClip = () => {
    if (stopping) return
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond })
    } catch {
      timer = setTimeout(recordClip, RETRY_MS)
      return
    }
    const chunks: Blob[] = []
    const startedAt = new Date()
    // Set when we end this clip on purpose (rotation or stop()).
    let endedByUs = false

    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    recorder.onstop = () => {
      const clip = new Blob(chunks, { type: mimeType })
      if (clip.size) {
        // Retry once; a failed clip shouldn't block the ones after it.
        uploads = uploads.then(() =>
          upload(clip, startedAt, new Date())
            .catch(() => upload(clip, startedAt, new Date()))
            .catch(() => undefined),
        )
      }
      // The browser ended the clip on its own (e.g. an encoder error): keep recording.
      if (!endedByUs && !stopping) {
        clearTimeout(timer)
        timer = setTimeout(recordClip, RETRY_MS)
      }
    }

    try {
      recorder.start()
    } catch {
      // e.g. the camera is momentarily busy; try again shortly rather than stop recording.
      timer = setTimeout(recordClip, RETRY_MS)
      return
    }
    timer = setTimeout(() => {
      if (stopping) return
      endedByUs = true
      recorder.stop()
      recordClip()
    }, RECORDING_CLIP_MS)
    current = Object.assign(recorder, {
      endOnPurpose: () => {
        endedByUs = true
      },
    })
  }

  recordClip()

  return {
    stop: () => {
      stopping ??= (async () => {
        clearTimeout(timer)
        const recorder = current
        if (recorder && recorder.state !== 'inactive') {
          // `onstop` (which queues the upload) runs before this listener.
          const stopped = new Promise((resolve) =>
            recorder.addEventListener('stop', resolve, { once: true }),
          )
          recorder.endOnPurpose()
          recorder.stop()
          await stopped
        }
        await uploads
      })()
      return stopping
    },
  }
}
