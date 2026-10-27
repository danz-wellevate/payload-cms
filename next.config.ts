import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Production runs under a sub-path (e.g. /plus_tech_exam); empty locally.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  output: 'standalone',
  // nginx redirects /plus_tech_exam -> /plus_tech_exam/; Next's default would strip it back (loop).
  skipTrailingSlashRedirect: true,
  // Disable all page/data caching in development so every save is immediately visible.
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      staleTimes: { dynamic: 0, static: 30 },
      // Next caches fetch() responses in Server Components across HMR refreshes by default.
      serverComponentsHmrCache: false,
    },
    headers: async () => [
      {
        source: '/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ],
  }),
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
