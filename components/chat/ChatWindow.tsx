'use client'

import React, { useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import { AnimatePresence, motion } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
  imagePreview?: string | null
  fileName?: string | null
}

interface ChatWindowProps {
  messages: Message[]
  isLoading: boolean
  chatTitle?: string
  onSuggestionClick: (suggestion: string) => void
  onMenuClick?: () => void
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function formatDateLabel(timestamp: number): string {
  const now = new Date()
  const date = new Date(timestamp)
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const msgDay = new Date(date); msgDay.setHours(0, 0, 0, 0)

  if (msgDay >= today) return 'Today'
  if (msgDay >= yesterday) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

type MessageGroup = {
  dateLabel: string
  messages: (Message & { idx: number })[]
}

function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let currentLabel = ''

  messages.forEach((msg, idx) => {
    const ts = msg.timestamp || Date.now()
    const label = formatDateLabel(ts)
    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ dateLabel: label, messages: [] })
    }
    groups[groups.length - 1].messages.push({ ...msg, idx })
  })

  return groups
}

export function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const groups = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto chat-scrollbar">
        {messages.length === 0 ? (

          /* Welcome */
          <div className="flex flex-col items-center justify-center h-full pb-8">
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[28px] md:text-[34px] font-bold tracking-tight text-center px-6"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {getGreeting()}, what's on your mind?
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-4 text-[15px] text-center"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Ask anything, attach a file, or upload an image 👇
            </motion.p>
          </div>

        ) : (

          /* Messages with date separators */
          <div className="flex flex-col w-full max-w-2xl mx-auto px-4 md:px-6">
            <div className="h-4 shrink-0" />

            {groups.map(group => (
              <div key={group.dateLabel}>
                {/* Date divider */}
                <div className="flex items-center gap-3 py-4">
                  <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {group.dateLabel}
                  </span>
                  <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
                </div>

                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {group.messages.map(msg => (
                      <MessageBubble
                        key={msg.idx}
                        role={msg.role}
                        content={msg.content}
                        timestamp={msg.timestamp}
                        isLoading={isLoading && msg.idx === messages.length - 1}
                        formatTime={formatTime}
                        imagePreview={msg.imagePreview}
                        fileName={msg.fileName}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} className="h-8 shrink-0" />
          </div>

        )}
      </div>
    </div>
  )
}
