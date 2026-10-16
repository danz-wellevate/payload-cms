import type { ContentStatsBlock } from '@/payload-types'

import React from 'react'

import { Eyebrow } from './Eyebrow'
import { anchor, paragraphs, sectionClass } from './utils'

export const ContentStats = ({ block }: { block: ContentStatsBlock }) => (
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
