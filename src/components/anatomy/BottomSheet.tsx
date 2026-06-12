import { useRef, useState, useEffect } from 'react'
import { useDrag } from '@use-gesture/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AnatomyPart } from '@/data/anatomyData'
import type { ModelKey } from '@/config/anatomyModels'
import type { AIChatMessage } from './AnatomyLayout'
import { PartViewer } from './PartViewer'

export type SheetState = 'hidden' | 'pill' | 'expanded'

const SYS_COLORS: Record<string, string> = {
  skeleton: '#94a3b8', cardiovascular: '#EF4444', muscular: '#F97316',
  visceral: '#EC4899', nervous: '#EAB308', lymphoid: '#A855F7', reference: '#6366F1',
}

interface Props {
  state:             SheetState
  part:              AnatomyPart | null
  selectedMeshName:  string | null
  selectedModelKey:  ModelKey | null
  onStateChange:     (s: SheetState) => void
  aiResponse:        string
  isLoadingAI:       boolean
  chatHistory:       AIChatMessage[]
  followUpStreaming:  string
  isLoadingFollowUp: boolean
  onAskAI:           () => void
  onFollowUp:        (msg: string) => void
  canAskAI:          boolean
  chatCost:          number
}

function formatMeshLabel(raw: string) {
  return raw.replace(/[_\-.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function BottomSheet({
  state, part, selectedMeshName, selectedModelKey, onStateChange,
  aiResponse, isLoadingAI,
  chatHistory, followUpStreaming, isLoadingFollowUp,
  onAskAI, onFollowUp, canAskAI, chatCost,
}: Props) {
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const [followInput, setFollowInput] = useState('')

  const displayName = part?.name ?? (selectedMeshName ? formatMeshLabel(selectedMeshName) : null)
  const sysColor = SYS_COLORS[part?.system ?? ''] ?? '#38E0C3'

  useEffect(() => {
    if (state === 'expanded') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory.length, followUpStreaming, state])

  const bind = useDrag(({ movement: [, my], last, velocity: [, vy] }) => {
    if (!last) return
    if (my > 50 || vy > 0.5) onStateChange('pill')
  }, { axis: 'y' })

  const handleSend = () => {
    const q = followInput.trim()
    if (!q) return
    setFollowInput('')
    onFollowUp(q)
  }

  if (state === 'hidden') return null

  return (
    <>
      {/* ── Pill — compact floating bar ───────────────────────────── */}
      {state === 'pill' && (
        <div style={{
          position: 'fixed',
          bottom: 90,
          left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100vw - 32px)', maxWidth: 400,
          zIndex: 150,
          background: 'rgba(8,12,20,0.94)',
          border: '0.5px solid rgba(255,255,255,0.13)',
          borderRadius: 14,
          padding: '11px 14px',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', gap: 11,
          animation: 'pillIn 160ms ease-out',
        }}>
          {/* System dot */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: sysColor,
            boxShadow: `0 0 8px ${sysColor}55`,
          }} />

          {/* Name + latin */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: '#fff', fontSize: 13, fontWeight: 500, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName ?? 'Structure selected'}
            </p>
            {part?.latinName && (
              <p style={{
                color: 'rgba(255,255,255,0.28)', fontSize: 9.5, margin: '1px 0 0',
                fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {part.latinName}
              </p>
            )}
          </div>

          {/* Expand */}
          <button
            onClick={() => onStateChange('expanded')}
            style={{
              background: 'rgba(56,224,195,0.1)',
              border: '0.5px solid rgba(56,224,195,0.28)',
              borderRadius: 8, padding: '6px 12px',
              color: '#38E0C3', fontSize: 11, fontWeight: 500,
              cursor: 'pointer', flexShrink: 0, transition: 'all 150ms ease',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            View ↑
          </button>
        </div>
      )}

      {/* ── Expanded — full bottom sheet ──────────────────────────── */}
      {state === 'expanded' && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => onStateChange('pill')}
            style={{
              position: 'fixed', inset: 0, zIndex: 148,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(3px)',
            }}
          />

          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 149,
            height: '86vh',
            background: 'rgba(8,12,20,0.98)',
            backdropFilter: 'blur(24px)',
            borderTop: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '16px 16px 0 0',
            display: 'flex', flexDirection: 'column',
            animation: 'sheetUp 240ms cubic-bezier(0.32,0.72,0,1)',
          }}>
            {/* Header row */}
            <div
              {...bind()}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 16px 10px',
                borderBottom: '0.5px solid rgba(255,255,255,0.07)',
                flexShrink: 0, cursor: 'grab', touchAction: 'none',
              }}
            >
              {/* Drag handle */}
              <div style={{
                position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2,
              }} />

              {/* System badge */}
              {part && (
                <span style={{
                  background: `${sysColor}22`, color: sysColor,
                  fontSize: 8, fontWeight: 500, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                  border: `0.5px solid ${sysColor}44`, flexShrink: 0,
                }}>
                  {part.system}
                </span>
              )}

              {/* Name */}
              <h3 style={{
                color: '#fff', fontSize: 14, fontWeight: 500,
                letterSpacing: '-0.02em', margin: 0, flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName ?? 'Unknown structure'}
              </h3>

              {/* Close → back to pill */}
              <button
                onClick={() => onStateChange('pill')}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)', fontSize: 15, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>

            {/* Scrollable content */}
            <div style={{
              flex: 1, overflowY: 'auto',
              WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
              padding: '14px 16px 100px',
              scrollbarWidth: 'none',
            }}>
              {/* 3D Part preview */}
              {selectedModelKey && selectedMeshName && (
                <div style={{ marginBottom: 16 }}>
                  <PartViewer modelKey={selectedModelKey} meshName={selectedMeshName} />
                </div>
              )}

              {/* Latin name */}
              {part?.latinName && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10.5, fontStyle: 'italic', margin: '0 0 14px' }}>
                  {part.latinName}
                </p>
              )}

              {/* Part details */}
              {part && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <p style={labelSt}>Function</p>
                    <p style={bodySt}>{part.function}</p>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <p style={labelSt}>Key Facts</p>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {part.keyFacts.map((f, i) => (
                        <li key={i} style={{ ...bodySt, marginBottom: 3 }}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {!part && selectedMeshName && (
                <p style={{ ...bodySt, marginBottom: 14, opacity: 0.6 }}>
                  Not in database. Use AI to get an explanation.
                </p>
              )}

              {/* AI section */}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                {!aiResponse && !isLoadingAI && (
                  <button
                    onClick={onAskAI}
                    disabled={!canAskAI}
                    style={{
                      width: '100%', padding: 11, borderRadius: 8,
                      background: canAskAI ? 'rgba(56,224,195,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `0.5px solid ${canAskAI ? 'rgba(56,224,195,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      color: canAskAI ? '#38E0C3' : 'rgba(255,255,255,0.25)',
                      fontSize: 12.5, fontWeight: 500,
                      cursor: canAskAI ? 'pointer' : 'not-allowed', marginBottom: 12,
                    }}
                  >
                    ✦ Explain with AI — {chatCost} tokens
                  </button>
                )}

                {isLoadingAI && !aiResponse && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 12px' }}>
                    <span style={spinner} />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Generating…</span>
                  </div>
                )}

                {aiResponse && (
                  <div style={aiBox}>
                    <div className="anatomy-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResponse}</ReactMarkdown>
                    </div>
                    {isLoadingAI && <span style={cursorSt}>▌</span>}
                  </div>
                )}

                {/* Follow-up chat history */}
                {chatHistory.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chatHistory.map((msg, i) => (
                      <div key={i} style={msg.role === 'user' ? userBubble : assistBubble}>
                        {msg.role === 'user' ? (
                          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, margin: 0 }}>
                            {msg.content}
                          </p>
                        ) : (
                          <div className="anatomy-md">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))}
                    {followUpStreaming && (
                      <div style={assistBubble}>
                        <div className="anatomy-md">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{followUpStreaming}</ReactMarkdown>
                        </div>
                        <span style={cursorSt}>▌</span>
                      </div>
                    )}
                    {isLoadingFollowUp && !followUpStreaming && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                        <span style={spinner} />
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Thinking…</span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                )}

                {/* Follow-up input */}
                {aiResponse && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <input
                      type="text"
                      value={followInput}
                      onChange={e => setFollowInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                      placeholder="Ask a follow-up…"
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.05)',
                        border: '0.5px solid rgba(255,255,255,0.12)',
                        borderRadius: 8, padding: '10px 12px',
                        color: 'rgba(255,255,255,0.85)', fontSize: 13,
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!followInput.trim() || isLoadingFollowUp || !canAskAI}
                      style={{
                        background: followInput.trim() && canAskAI ? '#38E0C3' : 'rgba(255,255,255,0.08)',
                        border: 'none', borderRadius: 8, padding: '10px 16px',
                        color: followInput.trim() && canAskAI ? '#0A0A0F' : 'rgba(255,255,255,0.3)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 150ms ease', flexShrink: 0,
                      }}
                    >→</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes pillIn { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .anatomy-md h2,.anatomy-md h3 { color:#fff; font-weight:500; letter-spacing:-0.02em; margin:8px 0 3px; }
        .anatomy-md h2{font-size:13px} .anatomy-md h3{font-size:12.5px}
        .anatomy-md p { color:rgba(255,255,255,0.72); font-size:12.5px; line-height:1.65; margin:0 0 7px; }
        .anatomy-md ul,.anatomy-md ol { padding-left:15px; margin:0 0 7px; }
        .anatomy-md li { color:rgba(255,255,255,0.72); font-size:12.5px; line-height:1.6; margin-bottom:3px; }
        .anatomy-md strong { color:rgba(255,255,255,0.9); font-weight:600; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </>
  )
}

const labelSt: React.CSSProperties   = { color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }
const bodySt: React.CSSProperties    = { color: 'rgba(255,255,255,0.68)', fontSize: 12.5, lineHeight: 1.6, margin: 0 }
const aiBox: React.CSSProperties     = { background: 'rgba(56,224,195,0.04)', border: '0.5px solid rgba(56,224,195,0.15)', borderRadius: 8, padding: '12px 14px', marginBottom: 4 }
const userBubble: React.CSSProperties  = { background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px' }
const assistBubble: React.CSSProperties = { background: 'rgba(56,224,195,0.04)', border: '0.5px solid rgba(56,224,195,0.12)', borderRadius: 8, padding: '9px 12px' }
const spinner: React.CSSProperties   = { display: 'inline-block', width: 12, height: 12, border: '1.5px solid rgba(56,224,195,0.25)', borderTopColor: '#38E0C3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }
const cursorSt: React.CSSProperties  = { color: '#38E0C3', animation: 'blink 1s infinite', fontSize: 13 }
