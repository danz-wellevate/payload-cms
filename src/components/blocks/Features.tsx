import type { FeaturesBlock } from '@/payload-types'

import React from 'react'

import { Eyebrow } from './Eyebrow'
import { anchor, sectionClass } from './utils'

export const Features = ({ block }: { block: FeaturesBlock }) => (
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
