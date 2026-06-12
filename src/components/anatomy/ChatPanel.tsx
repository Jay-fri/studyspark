import { useState, useEffect, useRef } from 'react'
import { groqStream, GROQ_MODELS } from '@/services/groq'
import { useTokens } from '@/hooks/useTokens'
import toast from 'react-hot-toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  partName:     string | null
  isOpen:       boolean
  tokenBalance: number
  onClose:      () => void
}

export function ChatPanel({ partName, isOpen, tokenBalance, onClose }: Props) {
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [isStreaming, setIsStreaming]   = useState(false)
  const [bottomPad, setBottomPad]       = useState(0)
  const abortRef                        = useRef<AbortController | null>(null)
  const bottomRef                       = useRef<HTMLDivElement>(null)
  const { spend } = useTokens()

  const canSend = tokenBalance >= 5 && !isStreaming && input.trim().length > 0

  // Handle mobile keyboard viewport
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function update() {
      if (!vv) return
      const offset = window.innerHeight - vv.height - vv.offsetTop
      setBottomPad(Math.max(0, offset))
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort()
    }
  }, [isOpen])

  async function handleSend() {
    if (!canSend) return
    const userMsg = input.trim()
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setIsStreaming(true)

    try {
      await spend('chat_anatomy' as any)
    } catch {
      toast.error('Not enough tokens')
      setMessages(messages)
      setIsStreaming(false)
      return
    }

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const systemPrompt = partName
      ? `You are an anatomy expert. The student is studying the ${partName}. Answer concisely and accurately, in 2-4 sentences unless more detail is requested.`
      : `You are an anatomy expert. Answer concisely and accurately.`

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...newMessages.map(m => ({ role: m.role, content: m.content })),
    ]

    let assistantMsg = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      for await (const chunk of groqStream(apiMessages, GROQ_MODELS.fast, ctrl.signal)) {
        assistantMsg += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg }
          return updated
        })
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('AI response failed')
        setMessages(prev => prev.slice(0, -1))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      paddingBottom: bottomPad,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div>
          <p style={{ color: '#fff', fontSize: '13px', fontWeight: 500, margin: 0 }}>
            Ask About {partName ?? 'Anatomy'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '2px 0 0' }}>
            5 tokens per message
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            width: '26px',
            height: '26px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        scrollbarWidth: 'none',
      }}>
        {messages.length === 0 ? (
          <p style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: '12px',
            textAlign: 'center',
            marginTop: '20px',
          }}>
            Ask anything about {partName ?? 'human anatomy'}
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: '10px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '85%',
                background: msg.role === 'user'
                  ? 'rgba(56,224,195,0.12)'
                  : 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${msg.role === 'user' ? 'rgba(56,224,195,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                padding: '8px 12px',
              }}>
                <p style={{
                  color: msg.role === 'user' ? '#38E0C3' : 'rgba(255,255,255,0.75)',
                  fontSize: '12px',
                  lineHeight: 1.55,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                  {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                    <span style={{ color: '#38E0C3' }}>▌</span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex',
        gap: '8px',
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={`Ask about ${partName ?? 'anatomy'}…`}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '12px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            background: canSend ? 'rgba(56,224,195,0.15)' : 'rgba(255,255,255,0.04)',
            border: `0.5px solid ${canSend ? 'rgba(56,224,195,0.3)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            cursor: canSend ? 'pointer' : 'not-allowed',
            color: canSend ? '#38E0C3' : 'rgba(255,255,255,0.2)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
