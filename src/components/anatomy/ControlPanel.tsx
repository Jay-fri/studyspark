import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LAYER_GROUPS, LAYER_GROUP_KEYS } from '@/config/anatomyModels'
import { ANATOMY_PARTS, type AnatomyPart } from '@/data/anatomyData'
import { useAnatomyHistory, type AnatomySession } from '@/hooks/useAnatomyHistory'

const SYS_COLORS: Record<string, string> = {
  skeleton: '#94a3b8', cardiovascular: '#EF4444', muscular: '#F97316',
  visceral: '#EC4899', nervous: '#EAB308', lymphoid: '#A855F7', reference: '#6366F1',
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Props {
  bp:              string
  visibleGroups:   Set<string>
  loadingGroups:   Set<string>
  opacity:         number
  onToggleGroup:   (key: string) => void
  onOpacityChange: (v: number) => void
  onResetView:     () => void
  onPartSelect:    (part: AnatomyPart) => void
  onHistoryLoad?:  (session: AnatomySession) => void
}

export function ControlPanel({
  visibleGroups,
  loadingGroups,
  opacity,
  onToggleGroup,
  onOpacityChange,
  onResetView,
  onPartSelect,
  onHistoryLoad,
}: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'layers' | 'history'>('layers')
  const [searchValue, setSearchValue] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: sessions = [], isLoading: histLoading } = useAnatomyHistory()

  const filtered = searchValue.trim()
    ? ANATOMY_PARTS.filter(p =>
        p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        p.latinName.toLowerCase().includes(searchValue.toLowerCase()) ||
        p.system.toLowerCase().includes(searchValue.toLowerCase())
      ).slice(0, 8)
    : []

  const handleSelect = (part: AnatomyPart) => {
    setSearchValue('')
    setDropdownOpen(false)
    onPartSelect(part)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 500,
    letterSpacing: '0.04em', textTransform: 'uppercase',
    background: active ? 'rgba(56,224,195,0.08)' : 'transparent',
    border: 'none',
    borderBottom: `0.5px solid ${active ? '#38E0C3' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#38E0C3' : 'rgba(255,255,255,0.35)',
    cursor: 'pointer', transition: 'all 150ms ease',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '20px 18px 14px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 12,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>←</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Back</span>
        </button>
        <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
          Anatomy Explorer
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '3px 0 0' }}>
          3D Human Body
        </p>
      </div>

      {/* Tab strip */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        <button style={tabStyle(tab === 'layers')} onClick={() => setTab('layers')}>Layers</button>
        <button style={tabStyle(tab === 'history')} onClick={() => setTab('history')}>History</button>
      </div>

      {/* Search — always visible */}
      <div style={{ padding: '12px 18px 0', flexShrink: 0, position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search parts…"
          value={searchValue}
          onChange={e => { setSearchValue(e.target.value); setDropdownOpen(true) }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: `0.5px solid ${dropdownOpen && filtered.length ? 'rgba(56,224,195,0.25)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: dropdownOpen && filtered.length ? '8px 8px 0 0' : '8px',
            padding: '8px 12px',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms ease',
          }}
        />

        {dropdownOpen && filtered.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%', left: 18, right: 18,
            background: 'rgba(8,12,20,0.98)',
            border: '0.5px solid rgba(56,224,195,0.2)',
            borderTop: 'none', borderRadius: '0 0 8px 8px',
            zIndex: 100, maxHeight: 240, overflowY: 'auto', scrollbarWidth: 'none',
          }}>
            {filtered.map((part, i) => (
              <button
                key={part.id}
                onMouseDown={() => handleSelect(part)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', background: 'none', border: 'none',
                  borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                  padding: '9px 12px', cursor: 'pointer',
                  textAlign: 'left', transition: 'background 100ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,224,195,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: SYS_COLORS[part.system] ?? '#fff',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: 12.5, fontWeight: 500, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {part.name}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontStyle: 'italic', margin: '1px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {part.latinName}
                  </p>
                </div>
                <span style={{
                  color: SYS_COLORS[part.system] ?? 'rgba(255,255,255,0.3)',
                  fontSize: 9, fontWeight: 500, letterSpacing: '0.05em',
                  textTransform: 'uppercase', flexShrink: 0,
                }}>
                  {part.system}
                </span>
              </button>
            ))}
          </div>
        )}

        {dropdownOpen && searchValue.trim() && filtered.length === 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 18, right: 18,
            background: 'rgba(8,12,20,0.98)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderTop: 'none', borderRadius: '0 0 8px 8px',
            padding: '10px 14px', zIndex: 100,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11.5, margin: 0 }}>No parts found</p>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 20px', scrollbarWidth: 'none' }}>

        {/* ── LAYERS TAB ── */}
        {tab === 'layers' && (
          <>
            <p style={{
              color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: 10, marginTop: 4,
            }}>Layers</p>

            {LAYER_GROUP_KEYS.map(key => {
              const group    = LAYER_GROUPS[key]
              const isVis    = visibleGroups.has(key)
              const isLoading = loadingGroups.has(key)
              return (
                <button
                  key={key}
                  onClick={() => onToggleGroup(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    background: isVis ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: `0.5px solid ${isVis ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
                    borderRadius: 8, padding: '9px 10px', cursor: 'pointer',
                    marginBottom: 4, transition: 'all 150ms ease', textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isVis ? group.color : 'rgba(255,255,255,0.15)',
                    flexShrink: 0, transition: 'background 150ms ease',
                  }} />
                  <span style={{ fontSize: 14 }}>{group.icon}</span>
                  <span style={{
                    flex: 1,
                    color: isVis ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                    fontSize: 12.5, fontWeight: isVis ? 500 : 400,
                    transition: 'color 150ms ease',
                  }}>{group.label}</span>
                  {isLoading ? (
                    <span style={{
                      width: 14, height: 14,
                      border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: '#38E0C3',
                      borderRadius: '50%', display: 'inline-block',
                      animation: 'spin 0.8s linear infinite', flexShrink: 0,
                    }} />
                  ) : isVis ? (
                    <span style={{ color: '#38E0C3', fontSize: 11 }}>✓</span>
                  ) : null}
                </button>
              )
            })}

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{
                  color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
                }}>Opacity</p>
                <span style={{ color: '#38E0C3', fontSize: 11 }}>{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range" min={0.1} max={1} step={0.05} value={opacity}
                onChange={e => onOpacityChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#38E0C3', cursor: 'pointer' }}
              />
            </div>

            <button
              onClick={onResetView}
              style={{
                marginTop: 16, width: '100%',
                background: 'rgba(56,224,195,0.08)',
                border: '0.5px solid rgba(56,224,195,0.2)',
                borderRadius: 8, padding: '9px',
                color: '#38E0C3', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', transition: 'all 150ms ease',
              }}
            >↺ Reset View</button>
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <>
            <p style={{
              color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: 10, marginTop: 4,
            }}>Recent Chats</p>

            {histLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
                <span style={{
                  width: 18, height: 18,
                  border: '1.5px solid rgba(255,255,255,0.15)', borderTopColor: '#38E0C3',
                  borderRadius: '50%', display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }} />
              </div>
            )}

            {!histLoading && sessions.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 32 }}>
                <p style={{ color: 'rgba(56,224,195,0.3)', fontSize: 22, margin: '0 0 8px' }}>⚗</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: 0 }}>
                  No anatomy chats yet
                </p>
                <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10.5, margin: '4px 0 0' }}>
                  Click a body part and ask the AI
                </p>
              </div>
            )}

            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => onHistoryLoad?.(session)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '0.5px solid rgba(255,255,255,0.07)',
                  borderRadius: 8, padding: '10px 10px', cursor: 'pointer',
                  marginBottom: 6, textAlign: 'left', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(56,224,195,0.05)'
                  e.currentTarget.style.borderColor = 'rgba(56,224,195,0.18)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                  background: SYS_COLORS[session.part_system] ?? '#6366F1',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <p style={{
                      color: '#fff', fontSize: 12.5, fontWeight: 500, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>{session.part_name}</p>
                    <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9.5, flexShrink: 0 }}>
                      {fmtDate(session.created_at)}
                    </span>
                  </div>
                  <p style={{
                    color: 'rgba(255,255,255,0.3)', fontSize: 10.5, margin: '3px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {session.ai_response.replace(/[#*`]/g, '').slice(0, 58)}…
                  </p>
                  {session.chat_history.length > 0 && (
                    <p style={{ color: 'rgba(56,224,195,0.45)', fontSize: 9.5, margin: '3px 0 0' }}>
                      {session.chat_history.filter(m => m.role === 'user').length} follow-up{session.chat_history.filter(m => m.role === 'user').length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Z-Anatomy credit */}
      <div style={{
        padding: '10px 18px 14px',
        borderTop: '0.5px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 9.5, margin: 0, letterSpacing: '0.03em' }}>
          3D models courtesy of{' '}
          <a
            href="https://www.z-anatomy.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(56,224,195,0.45)', textDecoration: 'none' }}
          >Z-Anatomy</a>
          {' '}— open-source atlas
        </p>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
