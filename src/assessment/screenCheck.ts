// Checks that a shared screen actually shows the exam window. With several monitors the
// candidate can pick one the exam isn't on, which records an idle (often black) display.
//
// How: while checking, the page shows a small magenta square with a green centre (see
// <ScreenMarker />). We look for those two colours, together, in frames of the shared screen.

export const SCREEN_MARKER = { size: 96, inner: 40, outer: '#ff00ff', center: '#00ff00' }

const ANALYSIS_WIDTH = 480
const ATTEMPTS = 6
const ATTEMPT_DELAY_MS = 350

export type ScreenCheck = 'ok' | 'wrong-screen' | 'unknown'

export const checkSharedScreen = async (stream: MediaStream): Promise<ScreenCheck> => {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  await video.play().catch(() => undefined)

  const canvas = document.createElement('canvas')
  const g = canvas.getContext('2d', { willReadFrequently: true })
  let sawFrame = false

  try {
    for (let i = 0; i < ATTEMPTS; i++) {
      await new Promise((resolve) => setTimeout(resolve, ATTEMPT_DELAY_MS))
      if (!g || !video.videoWidth) continue
      sawFrame = true

      const w = ANALYSIS_WIDTH
      const h = Math.round((w * video.videoHeight) / video.videoWidth)
      canvas.width = w
      canvas.height = h
      g.drawImage(video, 0, 0, w, h)
      const d = g.getImageData(0, 0, w, h).data

      let magenta = 0
      let green = 0
      for (let p = 0; p < d.length; p += 4) {
        const r = d[p],
          gr = d[p + 1],
          b = d[p + 2]
        if (r > 190 && gr < 80 && b > 190) magenta++
        else if (r < 80 && gr > 190 && b < 80) green++
      }
      // Even on a large or high-DPI screen the marker covers well over these pixel counts.
      if (magenta > 40 && green > 8) return 'ok'
    }
    // If the browser never delivered a frame we can't tell; don't block the candidate.
    return sawFrame ? 'wrong-screen' : 'unknown'
  } finally {
    video.pause()
    video.srcObject = null
  }
}
