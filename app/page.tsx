'use client'

import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatInput } from '@/components/chat/ChatInput'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
  imagePreview?: string | null   // shown in the user bubble
  fileName?: string | null       // shown as a file badge in the user bubble
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

// File types we can extract text from
const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.xml', '.yaml', '.yml', '.log', '.sh', '.env', '.config']
const TEXT_MIME_TYPES = ['text/plain', 'text/csv', 'application/json', 'text/markdown', 'text/html', 'text/xml', 'text/javascript', 'application/javascript']

function canReadAsText(file: File): boolean {
  return TEXT_MIME_TYPES.some(t => file.type.startsWith(t)) ||
    TEXT_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

async function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Ref to always have the latest chats without stale closures
  const chatsRef = useRef<Chat[]>([])
  useEffect(() => { chatsRef.current = chats }, [chats])

  // Load from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem('clabot_chats')
    const savedActiveId = localStorage.getItem('clabot_active_chat_id')
    
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats)
        if (Array.isArray(parsed)) {
          setChats(parsed)
        }
      } catch (e) {
        console.error('Failed to parse chats from localStorage', e)
      }
    }
    
    if (savedActiveId) {
      setActiveChatId(savedActiveId)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage on changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('clabot_chats', JSON.stringify(chats))
      if (activeChatId) {
        localStorage.setItem('clabot_active_chat_id', activeChatId)
      } else {
        localStorage.removeItem('clabot_active_chat_id')
      }
    }
  }, [chats, activeChatId, isLoaded])

  const activeChat = chats.find(c => c.id === activeChatId)

  const createNewChat = () => {
    const newChat: Chat = {
      id: uuidv4(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
    }
    setChats(prev => [newChat, ...prev])
    setActiveChatId(newChat.id)
    setIsMobileMenuOpen(false)
  }

  const deleteChat = (id: string) => {
    setChats(prev => prev.filter(c => c.id !== id))
    if (activeChatId === id) setActiveChatId(null)
  }

  const renameChat = (id: string, newTitle: string) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))
  }

  const sendMessage = async (inputText: string, imageFile?: File | null, docFile?: File | null) => {
    // Image-only → smart auto prompt: tell the model to analyze it proactively
    const displayText = inputText.trim()
    const autoAnalyze = !displayText && !!imageFile  // user sent image with no text

    if (!displayText && !imageFile && !docFile) return
    if (loading) return

    // Read image as base64
    let base64Image: string | null = null
    if (imageFile) {
      base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(imageFile)
      })
    }

    // Read file: text files → extract text content, others → base64
    let fileContent: string | null = null
    let fileName: string | null = null
    let fileIsText = false
    if (docFile) {
      fileName = docFile.name

      if (isPdf(docFile)) {
        // PDF — send to server for text extraction
        try {
          const b64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(docFile)
          })
          const res = await fetch('/api/parse-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: b64 }),
          })
          if (res.ok) {
            const data = await res.json()
            fileContent = data.text
            fileIsText = true
          } else {
            fileContent = null
            fileIsText = false
          }
        } catch {
          fileContent = null
          fileIsText = false
        }
      } else if (canReadAsText(docFile)) {
        try {
          fileContent = await readFileText(docFile)
          fileIsText = true
        } catch {
          fileContent = null
        }
      } else {
        // Non-text file: base64 for potential future handling
        fileContent = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(docFile)
        })
        fileIsText = false
      }
    }

    let chatId = activeChatId
    if (!chatId) {
      const newChat: Chat = {
        id: uuidv4(),
        title: displayText.slice(0, 32) || (imageFile ? 'Image Analysis' : (docFile ? docFile.name.slice(0, 24) : 'New Conversation')),
        messages: [],
        createdAt: Date.now(),
      }
      setChats(prev => [newChat, ...prev])
      setActiveChatId(newChat.id)
      chatId = newChat.id
    }

    // Build display message — include image preview and file name so bubble renders them
    const userMessage: Message = {
      role: 'user',
      content: displayText,
      timestamp: Date.now(),
      imagePreview: base64Image,
      fileName: fileName,
    }
    setLoading(true)

    setChats(prev => prev.map(c =>
      c.id === chatId
        ? {
          ...c,
          title: c.messages.length === 0
            ? (displayText.slice(0, 32) || (imageFile ? '🖼 Image Analysis' : (docFile ? `📄 ${docFile.name.slice(0, 20)}` : 'New Conversation')))
            : c.title,
          messages: [...c.messages, userMessage]
        }
        : c
    ))

    try {
      // Use ref to get latest messages without stale closure
      const currentChat = chatsRef.current.find(c => c.id === chatId)
      const previousMessages = currentChat?.messages.filter(m => m.role !== 'assistant' || m.content !== '') || []
      // Build API messages: only role+content (strip UI-only fields)
      const lastMsg = previousMessages[previousMessages.length - 1]
      const alreadyAdded = lastMsg?.role === 'user' && lastMsg?.content === userMessage.content
      // For the API payload, if user sent image with no text, prompt the model to analyze
      const apiUserContent = autoAnalyze
        ? 'Please analyze this image in detail. Describe what you see, identify key elements, and provide any relevant insights.'
        : (displayText || (docFile ? `Please read and summarize the attached file: ${fileName}` : ''))
      const apiUserMessage = { role: 'user' as const, content: apiUserContent }
      const apiPrevious = previousMessages.map(({ role, content }) => ({ role, content }))
      const messages = alreadyAdded ? apiPrevious : [...apiPrevious, apiUserMessage]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          image: base64Image,
          fileContent: fileIsText ? fileContent : null,
          fileName,
          fileIsText,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.error?.message || errData?.error || `API error ${response.status}`)
      }

      const streamReader = response.body?.getReader()
      if (!streamReader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let assistantContent = ''

      setChats(prev => prev.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, { role: 'assistant', content: '', timestamp: Date.now() }] }
          : c
      ))

      while (true) {
        const { done, value } = await streamReader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantContent += chunk

        setChats(prev => prev.map(c =>
          c.id === chatId
            ? {
              ...c,
              messages: c.messages.map((m, i) =>
                i === c.messages.length - 1 ? { ...m, content: assistantContent } : m
              )
            }
            : c
        ))
      }
    } catch (error: any) {
      console.error('Error:', error)
      // Show error in chat so user isn't left in silence
      setChats(prev => prev.map(c =>
        c.id === chatId
          ? {
            ...c,
            messages: [...c.messages, {
              role: 'assistant',
              content: `⚠️ Something went wrong: ${error?.message || 'Unable to reach the server. Please try again.'}`,
              timestamp: Date.now()
            }]
          }
          : c
      ))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ChatLayout
      chats={chats}
      activeChatId={activeChatId}
      onChatSelect={(id) => { setActiveChatId(id); setIsMobileMenuOpen(false) }}
      onChatDelete={deleteChat}
      onChatRename={renameChat}
      onNewChat={createNewChat}
      isMobileMenuOpen={isMobileMenuOpen}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
    >
      <div className="flex flex-col h-full">
        <ChatWindow
          messages={activeChat?.messages || []}
          isLoading={loading}
          chatTitle={activeChat?.title}
          onSuggestionClick={(s) => sendMessage(s)}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={loading}
        />
      </div>
    </ChatLayout>
  )
}