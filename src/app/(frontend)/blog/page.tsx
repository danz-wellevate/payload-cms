import type { Metadata } from 'next'

import React from 'react'

import { PostCard } from '@/components/blog/PostCard'
import { getPosts, getSiteData } from '@/theme/getSiteData'

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteData()
  return { title: settings.siteName ? `Blog | ${settings.siteName}` : 'Blog' }
}

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <>
      <section className="pageHeader">
        <div className="container">
          <p className="eyebrow">Blog</p>
          <h1>Articles &amp; insights</h1>
          <p className="lead">Ideas and practical guides on design, content and building for the web.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {posts.length ? (
            <div className="postGrid">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="muted">No posts yet — add one in Admin → Blog Posts.</p>
          )}
        </div>
      </section>
    </>
  )
}
