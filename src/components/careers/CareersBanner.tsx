import { Briefcase } from 'lucide-react'
import React from 'react'

type Props = {
  heading: string
  description?: string | null
}

export function CareersBanner({ heading, description }: Props) {
  return (
    <div className="careers-banner">
      <div className="container">
        <div className="careers-banner__inner">
          <p className="careers-banner__eyebrow">
            <Briefcase className="careers-banner__eyebrow-icon" />
            Careers
          </p>
          <h1 className="careers-banner__heading">{heading}</h1>
          {description && <p className="careers-banner__description">{description}</p>}
        </div>
      </div>
    </div>
  )
}
