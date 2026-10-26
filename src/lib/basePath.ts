// Next's basePath is applied automatically to <Link>, router and redirect(), but not to
// fetch(), plain <a href>/<form action>, window.location, NextResponse.redirect or media URLs.
// NEXT_PUBLIC_BASE_PATH is inlined at build time (see next.config.ts and the Dockerfile).
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')

// Prefixes a root-relative path with the base path. Absolute URLs and already-prefixed
// paths are returned unchanged.
export const withBase = (path: string) =>
  BASE_PATH && path.startsWith('/') && !path.startsWith(`${BASE_PATH}/`) && path !== BASE_PATH
    ? `${BASE_PATH}${path}`
    : path
