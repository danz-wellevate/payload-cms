import type { CallToActionBlock } from '@/payload-types'

import React from 'react'

import { CMSLink } from '../site/CMSLink'
import { anchor } from './utils'

export const CallToAction = ({ block }: { block: CallToActionBlock }) => (
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
