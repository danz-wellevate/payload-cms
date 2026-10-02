'use client'

import type { OnMount } from '@monaco-editor/react'

import Editor from '@monaco-editor/react'
import React, { useEffect, useRef, useState } from 'react'

import { languages } from '@/playground/languages'

type RunResult = {
  status: { id: number; description: string }
  stdout: string
  stderr: string
  compileOutput: string
  message: string
  time: string | null
  memory: number | null
}

type Output = { result: RunResult } | { error: string }

export type PlaygroundEditor = Parameters<OnMount>[0]

type Props = {
  // Restores a previous draft (e.g. an assessment autosave) for this language.
  initialCode?: string | null
  initialLanguageId?: number | null
  // Namespaces Monaco models so drafts from different pages don't mix.
  modelPrefix?: string
  onEditorMount?: (editor: PlaygroundEditor) => void
  onLanguageChange?: (languageId: number) => void
  // Called after each run with the Judge0 status (or an error message).
  onRun?: (status: string) => void
  onStdinChange?: (stdin: string) => void
}

export const CodePlayground = ({
  initialCode,
  initialLanguageId,
  modelPrefix = 'playground',
  onEditorMount,
  onLanguageChange,
  onRun,
  onStdinChange,
}: Props) => {
  const [languageId, setLanguageId] = useState(
    initialLanguageId && languages.some((l) => l.id === initialLanguageId)
      ? initialLanguageId
      : languages[0].id,
  )
  const [stdin, setStdin] = useState('')
  const [output, setOutput] = useState<Output | null>(null)
  const [running, setRunning] = useState(false)
  const editorRef = useRef<PlaygroundEditor | null>(null)

  const language = languages.find((l) => l.id === languageId) ?? languages[0]

  const run = async () => {
    if (running) return
    const sourceCode = editorRef.current?.getValue() ?? ''
    setRunning(true)
    setOutput(null)

    try {
      const response = await fetch('/playground/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languageId, sourceCode, stdin }),
      })
      const data = await response.json()
      setOutput(response.ok ? data : { error: data.error ?? 'Something went wrong.' })
      onRun?.(response.ok ? data.result.status.description : 'Error')
    } catch {
      setOutput({ error: 'Could not reach the server. Check your connection.' })
      onRun?.('Error')
    } finally {
      setRunning(false)
    }
  }

  // Ctrl/Cmd + Enter inside the editor always calls the latest `run`.
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  })
  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current())
    onEditorMount?.(editor)
  }

  const resetCode = () => {
    editorRef.current?.setValue(language.starter)
    setOutput(null)
  }

  return (
    <div className="playground__main">
      <div className="playground__ide">
        <div className="playground__toolbar">
          <select
            aria-label="Language"
            className="playground__select"
            onChange={(e) => {
              setLanguageId(Number(e.target.value))
              onLanguageChange?.(Number(e.target.value))
              setOutput(null)
            }}
            value={languageId}
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <div className="playground__actions">
            <button className="playground__reset" onClick={resetCode} type="button">
              Reset
            </button>
            <button
              className="button button--primary playground__run"
              disabled={running}
              onClick={run}
              title="Ctrl + Enter"
              type="button"
            >
              {running ? 'Running…' : 'Run code'}
            </button>
          </div>
        </div>
        {/* Monaco keeps one model per path, so each language keeps its own draft. */}
        <Editor
          defaultValue={
            initialCode && language.id === initialLanguageId ? initialCode : language.starter
          }
          height="460px"
          language={language.monaco}
          loading={<div className="playground__loading">Loading editor…</div>}
          onMount={handleMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 4,
            automaticLayout: true,
            padding: { top: 12 },
          }}
          path={`${modelPrefix}/${language.id}`}
          theme="vs-dark"
        />
      </div>

      <label className="playground__stdin">
        <span className="playground__label">Input (stdin)</span>
        <textarea
          onChange={(e) => {
            setStdin(e.target.value)
            onStdinChange?.(e.target.value)
          }}
          placeholder="Optional input passed to your program"
          rows={3}
          value={stdin}
        />
      </label>

      <div aria-live="polite" className="playground__output">
        <p className="playground__label">Output</p>
        {running && <p className="muted">Running your code on Judge0…</p>}
        {!running && !output && <p className="muted">Run your code to see the output.</p>}
        {output && 'error' in output && <pre className="playground__error">{output.error}</pre>}
        {output && 'result' in output && <RunOutput result={output.result} />}
      </div>
    </div>
  )
}

const RunOutput = ({ result }: { result: RunResult }) => {
  // Judge0 status 3 = Accepted (the program ran and exited normally).
  const ok = result.status.id === 3
  const error = result.compileOutput || result.stderr || result.message

  return (
    <>
      <p className={ok ? 'playground__status is-passed' : 'playground__status is-failed'}>
        {ok ? 'Ran successfully' : result.status.description}
        {result.time && <span className="muted"> · {result.time}s</span>}
        {result.memory != null && <span className="muted"> · {result.memory} KB</span>}
      </p>
      {result.stdout && <pre>{result.stdout}</pre>}
      {error && <pre className="playground__error">{error}</pre>}
      {!result.stdout && !error && <p className="muted">(no output)</p>}
    </>
  )
}
