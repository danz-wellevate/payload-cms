import React from 'react'

export const Eyebrow = ({ text }: { text?: string | null }) =>
  text ? <p className="eyebrow">{text}</p> : null
