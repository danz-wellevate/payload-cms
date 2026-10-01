import type { Metadata } from 'next'

import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { formatDate, PostCard, PostCover } from '@/components/blog/PostCard'
import { getPostBySlug, getPosts, getSiteData } from '@/theme/getSiteData'

type Args = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const [post, { settings }] = await Promise.all([getPostBySlug(slug), getSiteData()])
  if (!post) return {}

  return {
    title: settings.siteName ? `${post.title} | ${settings.siteName}` : post.title,
    description: post.excerpt || undefined,
  }
}

export default async function PostPage({ params }: Args) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const related = (await getPosts(4)).filter((p) => p.id !== post.id).slice(0, 3)

  return (
    <>
      <article className="article">
        <header className="container article__header">
          <Link className="article__back" href="/blog">
            ← All articles
          </Link>
          <p className="postMeta muted">
            {post.category && <span className="postMeta__category">{post.category}</span>}
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            {post.authorName && <span>By {post.authorName}</span>}
          </p>
          <h1>{post.title}</h1>
          {post.excerpt && <p className="lead">{post.excerpt}</p>}
        </header>

        <div className="container article__cover">
          <PostCover className="postCover--wide" post={post} />
        </div>

        <div className="container">
          <RichText className="prose" data={post.content} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="section section--surface">
          <div className="container">
            <div className="sectionHeading">
              <h2>Keep reading</h2>
            </div>
            <div className="postGrid">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
