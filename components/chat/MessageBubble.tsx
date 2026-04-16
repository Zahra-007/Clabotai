'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Check, FileText } from 'lucide-react'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  timestamp?: number
  formatTime?: (ts: number) => string
  imagePreview?: string | null
  fileName?: string | null
}

export function MessageBubble({
  role,
  content,
  isLoading,
  timestamp,
  formatTime,
  imagePreview,
  fileName,
}: MessageBubbleProps) {
  const isAssistant = role === 'assistant'
  const [copied, setCopied] = useState(false)
  const [imgExpanded, setImgExpanded] = useState(false)

  useEffect(() => {
    if (!imgExpanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImgExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [imgExpanded])

  const handleCopy = async () => {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const timeStr = timestamp && formatTime ? formatTime(timestamp) : null

  // ───────── USER MESSAGE ─────────
  if (!isAssistant) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full flex justify-end py-2"
      >
        <div className="max-w-[75%] flex flex-col items-end">

          {imagePreview && (
            <img
              src={imagePreview}
              onClick={() => setImgExpanded(true)}
              className="mb-2 rounded-2xl max-w-[220px] cursor-pointer border"
            />
          )}

          {fileName && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs">
              <FileText size={14} />
              <span>{fileName}</span>
            </div>
          )}

          {content && (
            <div className="px-4 py-3 rounded-2xl text-white text-sm"
              style={{ background: 'var(--color-brand)' }}>
              {content}
            </div>
          )}

          {timeStr && (
            <span className="text-[11px] mt-1 opacity-60">{timeStr}</span>
          )}
        </div>
      </motion.div>
    )
  }

  // ───────── ASSISTANT MESSAGE (FIXED ALIGNMENT) ─────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full flex justify-start py-3"
    >
      <div className="w-full max-w-3xl mx-auto px-4">

        <div className="max-w-[680px] text-[15px] leading-relaxed">

          {isLoading && !content ? (
            <div className="flex gap-1.5 py-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
            </div>
          ) : (
            <TypingText text={content} />
          )}

        </div>

        {content && (
          <div className="flex items-center gap-2 mt-2">
            {timeStr && (
              <span className="text-[11px] opacity-60">{timeStr}</span>
            )}

            <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition">
              <ActionBtn onClick={handleCopy}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </ActionBtn>
              <ActionBtn><ThumbsUp size={12} /></ActionBtn>
              <ActionBtn><ThumbsDown size={12} /></ActionBtn>
              <ActionBtn><RotateCcw size={12} /></ActionBtn>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  )
}

// ───────── SIMPLE MARKDOWN ─────────
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={key} className="list-disc pl-5 my-2 space-y-1">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  lines.forEach((line, idx) => {
    const key = `l${idx}`

    // Bullet list
    const bulletMatch = line.match(/^[-*•]\s+(.*)/)
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1])
      return
    }

    flushList(`ul${idx}`)

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={key} className="text-[20px] font-semibold mt-4 mb-2">{line.slice(2)}</h1>)
      return
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key} className="text-[18px] font-semibold mt-4 mb-2">{line.slice(3)}</h2>)
      return
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key} className="text-[16px] font-semibold mt-3 mb-1">{line.slice(4)}</h3>)
      return
    }

    // Divider
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(
        <div key={key} className="my-4 border-t border-gray-300" />
      )
      return
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={key} className="h-2" />)
      return
    }

    // Normal text
    elements.push(
      <p key={key} className="leading-relaxed mb-2 whitespace-pre-wrap">
        {renderInline(line)}
      </p>
    )
  })

  flushList('final')

  return <>{elements}</>
}

// ───────── ACTION BUTTON ─────────
function ActionBtn({ children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-md hover:bg-black/10 transition"
    >
      {children}
    </button>
  )
}
function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("")

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i))
      i++
      if (i > text.length) clearInterval(interval)
    }, 10) // speed (lower = faster)

    return () => clearInterval(interval)
  }, [text])

  return <MarkdownContent content={displayed} />
}
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const innerText = part.slice(2, -2)
      if (innerText.length <= 45) {
        return <strong key={i}>{innerText}</strong>
      }
      return <span key={i}>{innerText}</span>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-gray-100 text-sm">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}