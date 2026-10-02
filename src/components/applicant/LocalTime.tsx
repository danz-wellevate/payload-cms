'use client'

import React from 'react'

// Formats a timestamp in the viewer's own timezone.
export const LocalTime = ({ value }: { value: string }) => (
  <time dateTime={value} suppressHydrationWarning>
    {new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
  </time>
)
