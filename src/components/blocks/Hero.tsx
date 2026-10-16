import type { HeroBlock } from '@/payload-types'

import React from 'react'

import { CMSLink } from '../site/CMSLink'
import { Eyebrow } from './Eyebrow'
import { anchor } from './utils'

export const Hero = ({ block }: { block: HeroBlock }) => (
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
