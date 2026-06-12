import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AnatomyPart } from '@/data/anatomyData'
import { PART_BY_ID } from '@/data/anatomyData'
import type { ModelKey } from '@/config/anatomyModels'
import type { AIChatMessage } from './AnatomyLayout'
import { PartViewer } from './PartViewer'

interface Props {
  part:              AnatomyPart | null
  selectedMeshName:  string | null
  selectedModelKey:  ModelKey | null
  onAskAI:           () => void
  aiResponse:        string
  isLoadingAI:       boolean
  chatHistory:       AIChatMessage[]
  followUpStreaming:  string
  isLoadingFollowUp: boolean
  onFollowUp:        (msg: string) => void
  canAskAI:          boolean
  chatCost:          number
  aiScrollTick:      number
  onDeepDive:        () => void
}

const SYS_COLORS: Record<string, string> = {
  skeleton: '#E8E8E8', cardiovascular: '#EF4444', muscular: '#F97316',
  visceral: '#EC4899', nervous: '#EAB308', lymphoid: '#A855F7', reference: '#6366F1',
}

function formatMeshLabel(raw: string) {
  return raw.replace(/[_\-.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function InfoPanel({
  part, selectedMeshName, selectedModelKey,
  onAskAI, aiResponse, isLoadingAI,
  chatHistory, followUpStreaming, isLoadingFollowUp, onFollowUp,
  canAskAI, chatCost, aiScrollTick, onDeepDive: _onDeepDive,
}: Props) {
  const aiSectionRef  = useRef<HTMLDivElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const [followInput, setFollowInput] = useState('')

  const displayName = part?.name ?? (selectedMeshName ? formatMeshLabel(selectedMeshName) : null)
  const hasSelection = !!displayName

  // Scroll to AI section whenever aiScrollTick increments
  useEffect(() => {
    if (aiScrollTick > 0 && aiSectionRef.current) {
      aiSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [aiScrollTick])

  // Keep follow-up chat scrolled to bottom while streaming
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory.length, followUpStreaming])

  const handleSend = () => {
    const q = followInput.trim()
    if (!q) return
    setFollowInput('')
    onFollowUp(q)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '360px',
      zIndex: 50,
      background: 'rgba(8,8,14,0.97)',
      borderLeft: '0.5px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '18px 18px 14px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
          {hasSelection ? (
            <>
              {part ? (
                <span style={{
                  background: `${SYS_COLORS[part.system] ?? '#fff'}22`,
                  color: SYS_COLORS[part.system] ?? '#fff',
                  fontSize: '9px', fontWeight: 500, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px',
                  border: `0.5px solid ${SYS_COLORS[part.system] ?? '#fff'}44`,
                  display: 'inline-block', marginBottom: '6px',
                }}>{part.system}</span>
              ) : (
                <span style={{
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)',
                  fontSize: '9px', fontWeight: 500, letterSpacing: '0.07em',
                  textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  display: 'inline-block', marginBottom: '6px',
                }}>3D Structure</span>
              )}
              <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 500, letterSpacing: '-0.02em', margin: '0 0 2px' }}>
                {displayName}
              </h3>
              {part && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontStyle: 'italic', margin: 0 }}>
                  {part.latinName}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0 }}>
              Select a structure
            </p>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {hasSelection ? (
          <div style={{ padding: '16px 18px 32px' }}>

            {/* 3D Part Preview */}
            {selectedModelKey && selectedMeshName && (
              <div style={{ marginBottom: '18px' }}>
                <PartViewer modelKey={selectedModelKey} meshName={selectedMeshName} />
              </div>
            )}

            {/* Known part details */}
            {part && (
              <>
                <Section label="Location"><p style={bodyTxt}>{part.location}</p></Section>
                <Section label="Function"><p style={bodyTxt}>{part.function}</p></Section>
                <Section label="Key Facts">
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {part.keyFacts.map((f, i) => (
                      <li key={i} style={{ ...bodyTxt, marginBottom: '4px' }}>{f}</li>
                    ))}
                  </ul>
                </Section>
                {part.connectedTo.length > 0 && (
                  <Section label="Connected To">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {part.connectedTo.map(id => (
                        <span key={id} style={chip}>{PART_BY_ID[id]?.name ?? id}</span>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}

            {/* Unknown structure hint */}
            {!part && (
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', padding: '12px 14px', marginBottom: '18px',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
                  This structure isn't in our database yet. Use <strong style={{ color: '#38E0C3' }}>Explain with AI</strong> to get an instant breakdown.
                </p>
              </div>
            )}

            {/* ── AI Section ─────────────────────────────────────── */}
            <div ref={aiSectionRef} style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '18px', marginTop: part ? '18px' : 0 }}>
              <p style={sectionLabel}>AI Explanation</p>

              {!aiResponse && !isLoadingAI && (
                <button
                  onClick={onAskAI}
                  disabled={!canAskAI}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    background: canAskAI ? 'rgba(56,224,195,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${canAskAI ? 'rgba(56,224,195,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: canAskAI ? '#38E0C3' : 'rgba(255,255,255,0.25)',
                    fontSize: '12.5px', fontWeight: 500,
                    cursor: canAskAI ? 'pointer' : 'not-allowed',
                    transition: 'all 150ms ease',
                  }}
                >
                  ✦ Explain with AI — {chatCost} tokens
                </button>
              )}

              {isLoadingAI && !aiResponse && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  <span style={spinner} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Generating explanation…</span>
                </div>
              )}

              {/* Streaming / completed first response */}
              {(aiResponse || (isLoadingAI && aiResponse)) && (
                <div style={aiBox}>
                  <AIMarkdown content={aiResponse} />
                  {isLoadingAI && <span style={cursor}>▌</span>}
                </div>
              )}

              {/* Follow-up chat history */}
              {chatHistory.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatHistory.map((msg, i) => (
                    <div key={i} style={msg.role === 'user' ? userBubble : assistantBubble}>
                      {msg.role === 'user' ? (
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12.5px', margin: 0, lineHeight: 1.5 }}>
                          {msg.content}
                        </p>
                      ) : (
                        <AIMarkdown content={msg.content} />
                      )}
                    </div>
                  ))}
                  {/* Streaming follow-up */}
                  {followUpStreaming && (
                    <div style={assistantBubble}>
                      <AIMarkdown content={followUpStreaming} />
                      <span style={cursor}>▌</span>
                    </div>
                  )}
                  {isLoadingFollowUp && !followUpStreaming && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                      <span style={spinner} />
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Thinking…</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              )}

              {/* Follow-up input — shown after first AI response */}
              {aiResponse && (
                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    value={followInput}
                    onChange={e => setFollowInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                    }}
                    placeholder="Ask a follow-up question…"
                    rows={2}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)',
                      border: '0.5px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px', padding: '8px 10px',
                      color: 'rgba(255,255,255,0.85)', fontSize: '12px', lineHeight: 1.5,
                      resize: 'none', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!followInput.trim() || isLoadingFollowUp || !canAskAI}
                    style={{
                      background: followInput.trim() && canAskAI ? '#38E0C3' : 'rgba(255,255,255,0.08)',
                      border: 'none', borderRadius: '8px', padding: '8px 14px',
                      color: followInput.trim() && canAskAI ? '#0A0A0F' : 'rgba(255,255,255,0.3)',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 150ms ease', flexShrink: 0, height: '60px',
                    }}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', gap: '12px' }}>
            <span style={{ fontSize: '30px', opacity: 0.15 }}>🫀</span>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', padding: '0 24px' }}>
              Click any part of the model to see details
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .anatomy-md h1,.anatomy-md h2,.anatomy-md h3 {
          color:#fff; font-weight:500; letter-spacing:-0.02em; margin:10px 0 4px;
        }
        .anatomy-md h2 { font-size:13px; }
        .anatomy-md h3 { font-size:12.5px; color:rgba(255,255,255,0.85); }
        .anatomy-md p  { color:rgba(255,255,255,0.72); font-size:12.5px; line-height:1.65; margin:0 0 8px; }
        .anatomy-md ul,.anatomy-md ol { padding-left:16px; margin:0 0 8px; }
        .anatomy-md li { color:rgba(255,255,255,0.72); font-size:12.5px; line-height:1.6; margin-bottom:3px; }
        .anatomy-md strong { color:rgba(255,255,255,0.9); font-weight:600; }
        .anatomy-md code { background:rgba(56,224,195,0.1); color:#38E0C3; padding:1px 4px; border-radius:3px; font-size:11.5px; }
      `}</style>
    </div>
  )
}

function AIMarkdown({ content }: { content: string }) {
  return (
    <div className="anatomy-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={sectionLabel}>{label}</p>
      {children}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────
const bodyTxt: React.CSSProperties  = { color: 'rgba(255,255,255,0.68)', fontSize: '12.5px', lineHeight: 1.6, margin: 0 }
const sectionLabel: React.CSSProperties = { color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '5px' }
const chip: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '5px', padding: '2px 8px', color: 'rgba(255,255,255,0.55)', fontSize: '11px' }
const aiBox: React.CSSProperties = { background: 'rgba(56,224,195,0.04)', border: '0.5px solid rgba(56,224,195,0.15)', borderRadius: '8px', padding: '12px 14px' }
const userBubble: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', alignSelf: 'flex-end' }
const assistantBubble: React.CSSProperties = { background: 'rgba(56,224,195,0.04)', border: '0.5px solid rgba(56,224,195,0.12)', borderRadius: '8px', padding: '10px 14px' }
const spinner: React.CSSProperties = { display: 'inline-block', width: '12px', height: '12px', border: '1.5px solid rgba(56,224,195,0.25)', borderTopColor: '#38E0C3', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }
const cursor: React.CSSProperties = { color: '#38E0C3', animation: 'blink 1s infinite', fontSize: '13px' }
