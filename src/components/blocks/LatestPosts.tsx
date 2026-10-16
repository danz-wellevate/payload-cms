import type { LatestPostsBlock } from '@/payload-types'

import Link from 'next/link'
import React from 'react'

import { getPosts } from '@/theme/getSiteData'

import { PostCard } from '../blog/PostCard'
import { Eyebrow } from './Eyebrow'
import { anchor, sectionClass } from './utils'

export const LatestPosts = async ({ block }: { block: LatestPostsBlock }) => {
  const posts = await getPosts(block.limit || 3)

  return (
    <section className={sectionClass(block.background)} id={anchor(block.blockName)}>
      <div className="container">
        <div className="sectionHeading">
          <Eyebrow text={block.eyebrow} />
          <h2>{block.heading}</h2>
          {block.subheading && <p className="muted">{block.subheading}</p>}
        </div>
        <div className="postGrid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        {block.showViewAll && (
          <div className="sectionFooter">
            <Link className="button button--outline" href="/blog">
              View all posts
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
