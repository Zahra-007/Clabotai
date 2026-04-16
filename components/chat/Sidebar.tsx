'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { SquarePen, MessageSquare, PanelLeft, Settings, LogIn, LogOut, Trash2, X, Eye, EyeOff, Star, Pencil, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ClaIcon } from '@/components/ui/ClaIcon'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Chat {
  id: string
  title: string
  createdAt?: number
}

interface SidebarProps {
  chats: Chat[]
  activeChatId: string | null
  onChatSelect: (id: string) => void
  onChatDelete: (id: string) => void
  onChatRename: (id: string, newTitle: string) => void
  onNewChat: () => void
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
}

function groupChatsByDate(chats: Chat[]) {
  const now = Date.now()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)

  const groups: { label: string; chats: Chat[] }[] = [
    { label: 'Recents', chats: [] },
    { label: 'Yesterday', chats: [] },
    { label: 'Last 7 days', chats: [] },
    { label: 'Older', chats: [] },
  ]

  chats.forEach(chat => {
    const ts = chat.createdAt || now
    const d = new Date(ts); d.setHours(0, 0, 0, 0)
    if (d >= today) groups[0].chats.push(chat)
    else if (d >= yesterday) groups[1].chats.push(chat)
    else if (d >= weekAgo) groups[2].chats.push(chat)
    else groups[3].chats.push(chat)
  })

  return groups.filter(g => g.chats.length > 0)
}

/* ── Profile Settings Modal ── */
function ProfileModal({ user, onClose, onSignOut }: { user: { name: string; email: string }; onClose: () => void; onSignOut: () => void }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-80 rounded-2xl shadow-xl border p-6"
        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Profile Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5">
            <X size={15} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white mb-2"
            style={{ background: 'var(--color-brand)' }}>
            {name[0]?.toUpperCase() || 'U'}
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {[['Display Name', name, setName], ['Email', email, setEmail]].map(([label, val, setter]) => (
            <div key={label as string}>
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {label as string}
              </label>
              <input
                value={val as string}
                onChange={e => (setter as (v: string) => void)(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-[13px] outline-none"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
              />
            </div>
          ))}
        </div>

        <button
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white mb-2 hover:opacity-90 transition-opacity"
          style={{ background: 'var(--color-brand)' }}
          onClick={onClose}
        >
          Save Changes
        </button>
        <button
          className="w-full py-2.5 rounded-xl text-[13px] font-medium hover:bg-black/5 transition-colors flex items-center justify-center gap-2"
          style={{ color: '#ef4444' }}
          onClick={() => { onSignOut(); onClose() }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </motion.div>
    </div>
  )
}

/* ── Sign In Modal ── */
function SignInModal({ onClose, onSignIn }: { onClose: () => void; onSignIn: (name: string, email: string) => void }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) { setError('Enter a valid email'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (isSignUp && !name.trim()) { setError('Name is required'); return }
    onSignIn(isSignUp ? name : email.split('@')[0], email)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-80 rounded-2xl shadow-xl border p-6"
        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ClaIcon size={18} />
              <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {isSignUp ? 'Create account' : 'Welcome back'}
              </span>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              {isSignUp ? 'Join Clabot Intelligence' : 'Sign in to your account'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5">
            <X size={15} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--color-text-muted)' }}>Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
              />
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--color-text-muted)' }}>Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none pr-10"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white hover:opacity-90 transition-opacity mt-1"
            style={{ background: 'var(--color-brand)' }}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[12px] mt-4" style={{ color: 'var(--color-text-muted)' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          {' '}
          <button onClick={() => { setIsSignUp(v => !v); setError('') }} className="font-semibold" style={{ color: 'var(--color-brand)' }}>
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}

/* ── Main Sidebar ── */
export function Sidebar({
  chats,
  activeChatId,
  onChatSelect,
  onChatDelete,
  onChatRename,
  onNewChat,
  setIsSidebarOpen,
}: SidebarProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [hoveredChat, setHoveredChat] = useState<string | null>(null)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const grouped = groupChatsByDate(chats).map(g => ({
    ...g,
    label: g.label === 'Today' ? 'Recents' : g.label
  }))

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuOpenFor) return
    const handler = (e: MouseEvent) => setMenuOpenFor(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenFor])

  const openMenu = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ x: rect.right + 4, y: rect.top })
    setMenuOpenFor(chatId)
  }

  return (
    <div className="flex flex-col h-full py-4 px-3 overflow-hidden" style={{ background: 'transparent' }}>

      {/* Brand + Collapse */}
      <div className="flex items-center justify-between px-2 mb-5">
        <div className="flex items-center gap-2">
          <ClaIcon size={20} />
          <span className="text-[16px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
            Clabot
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* New Chat — modern compose icon */}
          <button
            onClick={onNewChat}
            className="p-1.5 rounded-lg hover:bg-black/6 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            title="New chat"
          >
            <SquarePen size={16} />
          </button>
          {/* Collapse */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-black/6 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            title="Close sidebar"
          >
            <PanelLeft size={16} />
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 py-1">
        {chats.length === 0 ? (
          <p className="px-3 py-2 text-[12px] italic" style={{ color: 'var(--color-text-muted)' }}>
            No conversations yet
          </p>
        ) : (
          grouped.map(group => {
            const isCollapsed = collapsedGroups.has(group.label)
            return (
            <div key={group.label}>
              <button 
                onClick={() => toggleGroup(group.label)}
                className="flex items-center gap-1 px-3 mb-1 mt-3 w-full text-left hover:opacity-80 transition-opacity"
              >
                <p className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {group.label}
                </p>
                {isCollapsed ? (
                  <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
                ) : (
                  <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
                )}
              </button>
              <AnimatePresence mode="popLayout" initial={false}>
                {!isCollapsed && group.chats.map(chat => (
                  <motion.div
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative group/chat-item overflow-hidden"
                    onMouseEnter={() => setHoveredChat(chat.id)}
                    onMouseLeave={() => setHoveredChat(null)}
                  >
                    {/* Rename inline input */}
                    {renamingId === chat.id ? (
                      <form
                        onSubmit={e => {
                          e.preventDefault()
                          if (renameValue.trim()) onChatRename(chat.id, renameValue.trim())
                          setRenamingId(null)
                        }}
                        className="px-2 py-0.5"
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => setRenamingId(null)}
                          onKeyDown={e => e.key === 'Escape' && setRenamingId(null)}
                          className="w-full px-2 py-1.5 rounded-xl text-[13px] outline-none border"
                          style={{
                            borderColor: 'var(--color-brand)',
                            background: 'var(--color-bg-surface)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </form>
                    ) : (
                      <div className="px-2 py-0.5">
                        <button
                          onClick={() => onChatSelect(chat.id)}
                          className="w-full flex items-center px-3 py-2 pr-8 transition-all duration-150 text-left"
                          style={{
                            background: activeChatId === chat.id ? 'rgba(0, 0, 0, 0.08)' : (hoveredChat === chat.id || menuOpenFor === chat.id ? 'rgba(0,0,0,0.04)' : 'transparent'),
                            borderRadius: '12px',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          <span className="text-[13px] truncate leading-tight">
                            {starredIds.has(chat.id) ? '⭐ ' : ''}{chat.title}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* ··· menu trigger */}
                    {(hoveredChat === chat.id || menuOpenFor === chat.id) && renamingId !== chat.id && (
                      <button
                        onMouseDown={e => {
                          e.stopPropagation()
                          openMenu(e, chat.id)
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                        title="More options"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Context menu portal */}
              {typeof window !== 'undefined' && menuOpenFor && menuPos &&
                group.chats.some(c => c.id === menuOpenFor) &&
                createPortal(
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.1 }}
                    onMouseDown={e => e.stopPropagation()}
                    className="fixed z-[999] w-44 rounded-2xl border shadow-xl overflow-hidden py-1"
                    style={{
                      top: menuPos.y,
                      left: menuPos.x,
                      background: 'var(--color-bg-surface)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {/* Star */}
                    <button
                      onClick={() => {
                        setStarredIds(prev => {
                          const next = new Set(prev)
                          next.has(menuOpenFor!) ? next.delete(menuOpenFor!) : next.add(menuOpenFor!)
                          return next
                        })
                        setMenuOpenFor(null)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] hover:bg-black/5 transition-colors text-left"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Star size={14} style={{ color: starredIds.has(menuOpenFor!) ? '#f59e0b' : 'var(--color-text-muted)' }}
                        fill={starredIds.has(menuOpenFor!) ? '#f59e0b' : 'none'} />
                      {starredIds.has(menuOpenFor!) ? 'Unstar' : 'Star'}
                    </button>

                    {/* Rename */}
                    <button
                      onClick={() => {
                        const chat = chats.find(c => c.id === menuOpenFor!)
                        setRenameValue(chat?.title || '')
                        setRenamingId(menuOpenFor!)
                        setMenuOpenFor(null)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] hover:bg-black/5 transition-colors text-left"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Pencil size={14} style={{ color: 'var(--color-text-muted)' }} />
                      Rename
                    </button>

                    <div className="mx-3 my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />

                    {/* Delete */}
                    <button
                      onClick={() => { onChatDelete(menuOpenFor!); setMenuOpenFor(null) }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] hover:bg-red-50 transition-colors text-left"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </motion.div>,
                  document.body
                )
              }
            </div>
            )
          })
        )}
      </div>

      {/* Bottom user section */}
      <div className="pt-3 border-t space-y-0.5" style={{ borderColor: 'var(--color-border)' }}>

        {user ? (
          /* Logged-in user */
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-black/5 transition-colors"
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: 'var(--color-brand)' }}>
              {user.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{user.name}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>
            </div>
            <Settings size={13} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        ) : (
          /* Not signed in */
          <button
            onClick={() => setShowSignIn(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-black/5 transition-colors"
          >
            <LogIn size={16} style={{ color: 'var(--color-text-secondary)' }} />
            <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>Sign in</span>
          </button>
        )}
      </div>

      {/* Modals — portaled to body so they escape sidebar overflow/transforms */}
      {typeof window !== 'undefined' && showProfile && user && createPortal(
        <AnimatePresence>
          <ProfileModal
            user={user}
            onClose={() => setShowProfile(false)}
            onSignOut={() => setUser(null)}
          />
        </AnimatePresence>,
        document.body
      )}
      {typeof window !== 'undefined' && showSignIn && createPortal(
        <AnimatePresence>
          <SignInModal
            onClose={() => setShowSignIn(false)}
            onSignIn={(name, email) => setUser({ name, email })}
          />
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
