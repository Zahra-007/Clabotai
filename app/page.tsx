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
  imagePreview?: string | null
  fileName?: string | null
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

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

  const chatsRef = useRef<Chat[]>([])
  useEffect(() => { chatsRef.current = chats }, [chats])

  // ✅ Load chats from localStorage, restore active chat on refresh via sessionStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('clabot_chats')
    const savedActiveId = sessionStorage.getItem('clabot_active_chat_id')

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
      setActiveChatId(savedActiveId) // ✅ restore on refresh
    } else {
      setActiveChatId(null) // ✅ fresh open → empty window
    }

    setIsLoaded(true)
  }, [])

  // ✅ Save chats to localStorage, active chat ID to sessionStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('clabot_chats', JSON.stringify(chats))

      if (activeChatId) {
        sessionStorage.setItem('clabot_active_chat_id', activeChatId)
      } else {
        sessionStorage.removeItem('clabot_active_chat_id')
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
    const displayText = inputText.trim()
    const autoAnalyze = !displayText && !!imageFile

    if (!displayText && !imageFile && !docFile) return
    if (loading) return

    let base64Image: string | null = null
    if (imageFile) {
      base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(imageFile)
      })
    }

    let fileContent: string | null = null
    let fileName: string | null = null
    let fileIsText = false
    if (docFile) {
      fileName = docFile.name

      if (isPdf(docFile)) {
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
      const currentChat = chatsRef.current.find(c => c.id === chatId)
      const previousMessages = currentChat?.messages.filter(m => m.role !== 'assistant' || m.content !== '') || []
      const lastMsg = previousMessages[previousMessages.length - 1]
      const alreadyAdded = lastMsg?.role === 'user' && lastMsg?.content === userMessage.content
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
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={activeChat?.messages || []}
            isLoading={loading}
            chatTitle={activeChat?.title}
            onSuggestionClick={(s) => sendMessage(s)}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
        </div>
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={loading}
        />
      </div>
    </ChatLayout>
  )
}