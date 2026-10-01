import Link from 'next/link'
import React from 'react'

import type {
  CallToActionBlock,
  ContentStatsBlock,
  FeaturesBlock,
  HeroBlock,
  LatestPostsBlock,
  Page,
} from '@/payload-types'

import { getPosts } from '@/theme/getSiteData'

import { PostCard } from '../blog/PostCard'
import { CMSLink } from '../site/CMSLink'

const sectionClass = (background?: string | null) =>
  background === 'surface' ? 'section section--surface' : 'section'

// Splits a textarea on blank lines into paragraphs.
const paragraphs = (text?: string | null) =>
  (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

// Section anchor from the block's name in admin, e.g. "Features" -> #features
const anchor = (blockName?: string | null) =>
  blockName
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || undefined

const Eyebrow = ({ text }: { text?: string | null }) =>
  text ? <p className="eyebrow">{text}</p> : null

const Hero = ({ block }: { block: HeroBlock }) => (
  <section className="hero" id={anchor(block.blockName)}>
    <div className="container hero__inner">
      <Eyebrow text={block.eyebrow} />
      <h1>{block.heading}</h1>
      {block.lead && <p className="lead">{block.lead}</p>}
      {!!block.buttons?.length && (
        <div className="buttonGroup">
          {block.buttons.map((button) => (
            <CMSLink
              className={`button button--${button.style || 'primary'}`}
              key={button.id}
              link={button}
            />
          ))}
        </div>
      )}
    </div>
  </section>
)

const Features = ({ block }: { block: FeaturesBlock }) => (
  <section className={sectionClass(block.background)} id={anchor(block.blockName)}>
    <div className="container">
      <div className="sectionHeading">
        <Eyebrow text={block.eyebrow} />
        <h2>{block.heading}</h2>
        {block.subheading && <p className="muted">{block.subheading}</p>}
      </div>
      {!!block.items?.length && (
        <div className="cardGrid">
          {block.items.map((item, i) => (
            <article className="card" key={item.id}>
              <span className="card__index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              {item.body && <p>{item.body}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  </section>
)

const ContentStats = ({ block }: { block: ContentStatsBlock }) => (
  <section className={sectionClass(block.background)} id={anchor(block.blockName)}>
    <div className={block.stats?.length ? 'container split' : 'container'}>
      <div>
        <Eyebrow text={block.eyebrow} />
        <h2>{block.heading}</h2>
        {paragraphs(block.body).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {block.note && <p className="muted">{block.note}</p>}
      </div>
      {!!block.stats?.length && (
        <dl className="stats">
          {block.stats.map((stat) => (
            <div className="stats__item" key={stat.id}>
              <dt className="muted">{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  </section>
)

const LatestPosts = async ({ block }: { block: LatestPostsBlock }) => {
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

const CallToAction = ({ block }: { block: CallToActionBlock }) => (
  <section className="section" id={anchor(block.blockName)}>
    <div className="container">
      <div className="ctaBand">
        <h2>{block.heading}</h2>
        {block.body && <p>{block.body}</p>}
        {block.button && <CMSLink className="button button--inverse" link={block.button} />}
      </div>
    </div>
  </section>
)

export const RenderBlocks = ({ blocks }: { blocks: Page['layout'] }) => (
  <>
    {blocks?.map((block) => {
      switch (block.blockType) {
        case 'hero':
          return <Hero block={block} key={block.id} />
        case 'features':
          return <Features block={block} key={block.id} />
        case 'contentStats':
          return <ContentStats block={block} key={block.id} />
        case 'latestPosts':
          return <LatestPosts block={block} key={block.id} />
        case 'cta':
          return <CallToAction block={block} key={block.id} />
        default:
          return null
      }
    })}
  </>
)
