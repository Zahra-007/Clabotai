'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Mic, Image, FileText, X, Square, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ChatInputProps {
  onSendMessage: (content: string, image?: File | null, file?: File | null) => void
  isLoading: boolean
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(!!SR)
  }, [])

  // Close attach menu on outside click
  useEffect(() => {
    if (!showAttachMenu) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (attachMenuRef.current?.contains(target)) return
      if (plusBtnRef.current?.contains(target)) return
      setShowAttachMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAttachMenu])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSend = useCallback(() => {
    if ((!input.trim() && !selectedImage && !selectedFile) || isLoading) return
    onSendMessage(input.trim(), selectedImage, selectedFile)
    setInput('')
    setSelectedImage(null)
    setSelectedFile(null)
    setImagePreview(null)
  }, [input, selectedImage, selectedFile, isLoading, onSendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          setSelectedImage(file)
          const reader = new FileReader()
          reader.onloadend = () => setImagePreview(reader.result as string)
          reader.readAsDataURL(file)
        }
        return
      }
    }
  }

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    // Use the user's browser/OS language automatically (ko-KR, ar-SA, en-US, etc.)
    recognition.lang = navigator.language || navigator.languages?.[0] || 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => { setIsRecording(true); setTranscript('') }

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' '
        else interim += event.results[i][0].transcript
      }
      setTranscript(interim)
      if (final) setInput(prev => prev + final)
    }

    recognition.onerror = () => { setIsRecording(false); setTranscript('') }
    recognition.onend = () => { setIsRecording(false); setTranscript('') }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setIsRecording(false)
    setTranscript('')
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setSelectedFile(null)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
    setShowAttachMenu(false)
    e.target.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setSelectedImage(null)
      setImagePreview(null)
    }
    setShowAttachMenu(false)
    e.target.value = ''
  }

  const displayValue = isRecording && transcript ? input + transcript : input
  const hasContent = !!(input.trim() || selectedImage || selectedFile)

  return (
    <div className="w-full max-w-[680px] mx-auto px-4 pb-5">

      {/* Image / file previews */}
      <AnimatePresence>
        {(imagePreview || selectedFile) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mb-2 flex gap-2"
          >
            {imagePreview && (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border group"
                style={{ borderColor: 'var(--color-border)' }}>
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setSelectedImage(null); setImagePreview(null) }}
                  className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full"
                >
                  <X size={10} />
                </button>
              </div>
            )}
            {selectedFile && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px]"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}>
                <FileText size={14} style={{ color: 'var(--color-brand)' }} />
                <span className="truncate max-w-[120px]">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)}>
                  <X size={12} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mb-2 flex items-center gap-2 justify-center"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[12px] font-medium text-red-500">
              {transcript || 'Listening...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input box */}
      <div
        className={cn(
          'relative w-full rounded-2xl border transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--color-brand)]/50 backdrop-blur-md',
          isRecording ? 'border-red-200' : 'border-transparent'
        )}
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          boxShadow: '0 1px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      >
        <div className="px-4 pt-3 pb-1">
          <textarea
            ref={textareaRef}
            value={displayValue}
            onChange={e => !isRecording && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Message Clabot..."
            rows={1}
            readOnly={isRecording}
            className="w-full resize-none border-none outline-none bg-transparent text-[14px] leading-relaxed"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)',
              minHeight: '24px',
              maxHeight: '200px',
            }}
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-2.5">

          {/* Attach button + inline popup (no portal) */}
          <div className="relative">
            {/* The popup menu — positioned upward, no portal needed */}
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  ref={attachMenuRef}
                  key="attach-menu"
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-full left-0 mb-2 w-48 rounded-2xl border shadow-xl overflow-hidden"
                  style={{
                    background: 'var(--color-bg-surface)',
                    borderColor: 'var(--color-border)',
                    zIndex: 100,
                  }}
                >
                  {/* Label links directly to input — 100% reliable, no programmatic click needed */}
                  <label
                    htmlFor="clabot-img-input"
                    onClick={() => setShowAttachMenu(false)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-[13px] transition-colors text-left cursor-pointer hover:bg-black/5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <Image size={15} style={{ color: 'var(--color-text-secondary)' }} />
                    Attach image
                  </label>
                  <div className="mx-4 border-t" style={{ borderColor: 'var(--color-border)' }} />
                  <label
                    htmlFor="clabot-doc-input"
                    onClick={() => setShowAttachMenu(false)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-[13px] transition-colors text-left cursor-pointer hover:bg-black/5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <FileText size={15} style={{ color: 'var(--color-text-secondary)' }} />
                    Attach file
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* + Button */}
            <button
              ref={plusBtnRef}
              onClick={() => setShowAttachMenu(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150 hover:bg-black/5 hover:scale-105 active:scale-95"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              title="Attach"
            >
              <Plus size={16} />
            </button>

            {/* File inputs — in the SAME component tree as the labels, so htmlFor always works */}
            <input
              id="clabot-img-input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, width: 1, height: 1 }}
              tabIndex={-1}
            />
            <input
              id="clabot-doc-input"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.py,.js,.ts,.tsx,.jsx,.html,.css,.xml,.yaml,.yml,.log"
              onChange={handleFileChange}
              style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, width: 1, height: 1 }}
              tabIndex={-1}
            />
          </div>
          {/* Mic + Send */}
          <div className="flex items-center gap-1.5">
            {speechSupported && (
              <button
                onClick={() => isRecording ? stopRecording() : startRecording()}
                title={isRecording ? 'Stop recording' : 'Voice input'}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 hover:scale-105 active:scale-95',
                  isRecording ? 'bg-red-100 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse' : 'hover:bg-black/5'
                )}
                style={!isRecording ? { color: 'var(--color-text-muted)' } : {}}
              >
                {isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={16} />}
              </button>
            )}

            <button
              onClick={handleSend}
              disabled={!hasContent || isLoading || isRecording}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                background: hasContent && !isLoading && !isRecording ? 'var(--color-brand)' : 'var(--color-border)',
                color: hasContent && !isLoading && !isRecording ? 'white' : 'var(--color-text-muted)',
                cursor: hasContent && !isLoading && !isRecording ? 'pointer' : 'default',
                opacity: hasContent && !isLoading && !isRecording ? 1 : 0.4,
              }}
            >
              <Send size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        Clabot can make mistakes. Verify important information.
      </p>
    </div>
  )
}
