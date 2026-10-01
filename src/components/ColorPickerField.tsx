'use client'

import type { TextFieldClientComponent } from 'payload'

import { TextInput, useField } from '@payloadcms/ui'
import React from 'react'

const HEX = /^#[0-9a-f]{6}$/i

export const ColorPickerField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError } = useField<string>({ path })

  return (
    <TextInput
      BeforeInput={
        <input
          aria-label={`${typeof field.label === 'string' ? field.label : field.name} picker`}
          disabled={readOnly}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: 40,
            height: 40,
            padding: 0,
            marginRight: 8,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            background: 'none',
            cursor: readOnly ? 'default' : 'pointer',
            flexShrink: 0,
          }}
          type="color"
          value={value && HEX.test(value) ? value : '#000000'}
        />
      }
      description={field.admin?.description}
      label={field.label}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      path={path}
      placeholder="#000000"
      readOnly={readOnly}
      required={field.required}
      showError={showError}
      value={value || ''}
    />
  )
}
