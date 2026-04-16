'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Check, FileText } from 'lucide-react'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  timestamp?: number
  formatTime?: (ts: number) => string
  imagePreview?: string | null   // base64 or object URL of attached image
  fileName?: string | null       // name of attached document
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setImgExpanded(false) }
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

  if (!isAssistant) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col w-full items-end py-2"
      >
        {/* Image preview — click to open fullscreen lightbox */}
        {imagePreview && (
          <div className="mb-1.5">
            <img
              src={imagePreview}
              alt="Attached image"
              onClick={() => setImgExpanded(true)}
              className="rounded-2xl object-cover cursor-pointer"
              style={{
                maxWidth: 220,
                maxHeight: 220,
                width: '100%',
                border: '1px solid var(--color-border)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
              }}
              title="Click to open"
            />
            {imgExpanded && typeof window !== 'undefined' && createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
                onClick={() => setImgExpanded(false)}
                style={{ backdropFilter: 'blur(6px)' }}
              >
                <img
                  src={imagePreview}
                  alt="Attached image"
                  className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl cursor-pointer"
                  onClick={e => e.stopPropagation()}
                />
              </div>,
              document.body
            )}
          </div>
        )}

        {/* File badge */}
        {fileName && (
          <div
            className="mb-1.5 flex items-center gap-2 px-3 py-2 rounded-2xl border text-[12px]"
            style={{
              background: 'rgba(99,102,241,0.08)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <FileText size={14} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
            <span className="truncate max-w-[180px]">{fileName}</span>
          </div>
        )}

        {/* Text bubble — only show if there's actual text */}
        {content && (
          <div
            className="w-fit max-w-[70%] px-4 py-3 rounded-2xl shadow-sm text-[14px] leading-[1.65] select-text text-white"
            style={{
              background: 'var(--color-brand)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
          </div>
        )}

        {timeStr && (
          <span className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {timeStr}
          </span>
        )}
      </motion.div>
    )
  }

  // ── Assistant bubble ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group/bubble flex flex-col w-full items-start py-2"
    >
      <div
        className="w-full max-w-[70%] text-[14px] leading-relaxed select-text"
        style={{
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {isLoading && !content ? (
          <div className="flex gap-1.5 py-2">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)', animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)', animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)', animationDelay: '300ms' }} />
          </div>
        ) : (
          <MarkdownContent content={content} />
        )}
      </div>

      {content && (
        <div className="flex items-center gap-2 mt-1.5">
          {timeStr && (
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {timeStr}
            </span>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-150">
            <ActionBtn onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            </ActionBtn>
            <ActionBtn title="Helpful"><ThumbsUp size={12} /></ActionBtn>
            <ActionBtn title="Not helpful"><ThumbsDown size={12} /></ActionBtn>
            <ActionBtn title="Regenerate"><RotateCcw size={12} /></ActionBtn>
          </div>
        </div>
      )}
    </motion.div>
  )
}

/** Very lightweight markdown renderer — bold, italic, code, headings, lists */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={key} className="list-disc list-outside pl-5 my-1 space-y-0.5">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  lines.forEach((line, idx) => {
    const key = `l${idx}`

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (numberedMatch) {
      flushList(`ul${idx}`)
      elements.push(
        <ol key={key} className="list-decimal list-outside pl-5 my-0.5">
          <li>{renderInline(numberedMatch[2])}</li>
        </ol>
      )
      return
    }

    // Unordered list
    const bulletMatch = line.match(/^[-*•]\s+(.*)/)
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1])
      return
    }

    flushList(`ul${idx}`)

    // Headings
    const h3 = line.match(/^###\s+(.*)/)
    if (h3) { elements.push(<h3 key={key} className="text-[15px] font-bold mt-3 mb-0.5">{renderInline(h3[1])}</h3>); return }
    const h2 = line.match(/^##\s+(.*)/)
    if (h2) { elements.push(<h2 key={key} className="text-[16px] font-bold mt-4 mb-1">{renderInline(h2[1])}</h2>); return }
    const h1 = line.match(/^#\s+(.*)/)
    if (h1) { elements.push(<h1 key={key} className="text-[18px] font-bold mt-4 mb-1">{renderInline(h1[1])}</h1>); return }

    // Code block (simple: lines starting with ```)
    if (line.startsWith('```')) return // skip fence markers

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(<hr key={key} className="my-3" style={{ borderColor: 'var(--color-border)' }} />)
      return
    }

    // Blank line
    if (line.trim() === '') {
      elements.push(<div key={key} className="h-2" />)
      return
    }

    // Normal paragraph
    elements.push(<p key={key} className="leading-relaxed whitespace-pre-wrap">{renderInline(line)}</p>)
  })

  flushList('final')

  return <>{elements}</>
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold**, *italic*, `code`, and markdown image links
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|!\[[^\]]*\]\([^)]+\))/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md text-[13px]"
          style={{ background: 'rgba(0,0,0,0.07)', fontFamily: 'ui-monospace, monospace' }}>
          {part.slice(1, -1)}
        </code>
      )
    // Markdown image: ![alt](url)
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch)
      return <LightboxImage key={i} src={imgMatch[2]} alt={imgMatch[1]} />
    return part
  })
}

/** Clickable image that opens a fullscreen lightbox on click */
function LightboxImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className="rounded-xl my-3 max-w-full cursor-pointer"
        style={{ maxHeight: 480, border: '1px solid var(--color-border)' }}
        title="Click to expand"
      />
      {open && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
          onClick={() => setOpen(false)}
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl cursor-pointer"
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  )
}

function ActionBtn({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg transition-colors hover:bg-black/6"
      style={{ color: 'var(--color-text-muted)' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'}
    >
      {children}
    </button>
  )
}
