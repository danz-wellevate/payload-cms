'use client'

import React, { useState } from 'react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

const EyeIcon = ({ crossed }: { crossed: boolean }) => (
  <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
    <path
      d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    {crossed && (
      <path d="M4 4l16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    )}
  </svg>
)

// Password field with an eye button to show or hide what's typed.
export const PasswordInput = (props: Props) => {
  const [visible, setVisible] = useState(false)

  return (
    <span className="passwordInput">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="passwordInput__toggle"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'Hide password' : 'Show password'}
        type="button"
      >
        <EyeIcon crossed={visible} />
      </button>
    </span>
  )
}
