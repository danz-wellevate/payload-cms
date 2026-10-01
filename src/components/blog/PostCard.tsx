import Link from 'next/link'
import React from 'react'

import type { Media, Post } from '@/payload-types'

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))

// Cover image, or a themed placeholder showing the category when no image is set.
export const PostCover = ({ post, className }: { post: Pick<Post, 'coverImage' | 'category' | 'title'>; className?: string }) => {
  const image = typeof post.coverImage === 'object' ? (post.coverImage as Media | null) : null

  return (
    <div className={`postCover ${className ?? ''}`}>
      {image?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={image.alt || post.title} src={image.url} />
      ) : (
        <span className="postCover__placeholder">{post.category || 'Article'}</span>
      )}
    </div>
  )
}

export const PostCard = ({ post }: { post: Omit<Post, 'content'> }) => (
  <article className="postCard">
    <Link className="postCard__link" href={`/blog/${post.slug}`}>
      <PostCover post={post} />
      <div className="postCard__body">
        <p className="postMeta muted">
          {post.category && <span className="postMeta__category">{post.category}</span>}
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </p>
        <h3>{post.title}</h3>
        {post.excerpt && <p className="postCard__excerpt">{post.excerpt}</p>}
        <span className="postCard__more">Read article →</span>
      </div>
    </Link>
  </article>
)
