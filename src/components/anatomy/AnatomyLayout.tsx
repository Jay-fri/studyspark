import { useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useWindowSize } from '@/hooks/useWindowSize'
import { useTokens } from '@/hooks/useTokens'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/services/supabase'
import { groqStream, GROQ_MODELS } from '@/services/groq'
import { ANATOMY_PARTS } from '@/data/anatomyData'
import type { AnatomyPart } from '@/data/anatomyData'
import type { ModelKey } from '@/config/anatomyModels'
import { LAYER_GROUPS } from '@/config/anatomyModels'
import { useInvalidateAnatomyHistory, type AnatomySession } from '@/hooks/useAnatomyHistory'
import { BodyCanvas } from './BodyCanvas'
import { ControlPanel } from './ControlPanel'
import { InfoPanel } from './InfoPanel'
import { BottomSheet, type SheetState } from './BottomSheet'
import { TopBar } from './TopBar'
import { Drawer } from './Drawer'
import { HoverTooltip } from './HoverTooltip'
import { DeviceWarningModal } from './DeviceWarningModal'
import toast from 'react-hot-toast'

export type AIChatMessage = { role: 'user' | 'assistant'; content: string }
type ZoomHandlers = { setDist: (d: number) => void; zoomBy: (f: number) => void }

const ZOOM_MAX_DIST = 8.0
const ZOOM_MIN_DIST = 0.2
const zoomToDist = (z: number) => ZOOM_MIN_DIST + (1 - z) * (ZOOM_MAX_DIST - ZOOM_MIN_DIST)
const distToZoom = (d: number) => Math.max(0, Math.min(1, 1 - (d - ZOOM_MIN_DIST) / (ZOOM_MAX_DIST - ZOOM_MIN_DIST)))

function findPartByMeshName(meshName: string): AnatomyPart | null {
  const lower = meshName.toLowerCase().replace(/[_\-.]/g, ' ')
  let p = ANATOMY_PARTS.find(x => x.meshNames.some(m => m.toLowerCase() === meshName.toLowerCase()))
  if (p) return p
  p = ANATOMY_PARTS.find(x =>
    lower.includes(x.name.toLowerCase()) ||
    x.name.toLowerCase().includes(lower) ||
    x.meshNames.some(m => lower.includes(m.toLowerCase()) || m.toLowerCase().includes(lower))
  )
  return p ?? null
}

function formatMeshLabel(raw: string): string {
  return raw.replace(/[_\-.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function AnatomyLayout() {
  const bp                         = useBreakpoint()
  const { width: vw, height: vh }  = useWindowSize()
  const { spend, canUse, getCost }  = useTokens()
  const profile                     = useAuthStore(s => s.profile)
  const invalidateHistory           = useInvalidateAnatomyHistory()
  const sessionIdRef                = useRef<string | null>(null)
  const isHistoryLoadRef            = useRef(false)

  // Show device-warning modal on every open for non-desktop visitors
  const [showWarning, setShowWarning] = useState(() => bp !== 'desktop')

  // Layer state
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(new Set(['skeleton']))
  const [loadingGroups]                   = useState<Set<string>>(new Set())
  const [opacity, setOpacity]             = useState(1.0)

  // Selection
  const [selectedMeshName,  setSelectedMeshName]  = useState<string | null>(null)
  const [selectedPart,      setSelectedPart]      = useState<AnatomyPart | null>(null)
  const [selectedModelKey,  setSelectedModelKey]  = useState<ModelKey | null>(null)
  const [hoveredMeshName,   setHoveredMeshName]   = useState<string | null>(null)

  // UI
  const [isDrawerOpen,     setIsDrawerOpen]     = useState(false)
  const [bottomSheetState, setBottomSheetState] = useState<SheetState>('hidden')
  const [searchQuery]                            = useState('')

  // Zoom slider (desktop main canvas)
  const [sliderZoom,    setSliderZoom]    = useState(distToZoom(4.5)) // ≈ desktop default
  const zoomHandlersRef                   = useRef<ZoomHandlers | null>(null)
  const onZoomRegister                    = useCallback((h: ZoomHandlers) => { zoomHandlersRef.current = h }, [])
  const handleSlider                      = useCallback((val: number) => {
    setSliderZoom(val)
    zoomHandlersRef.current?.setDist(zoomToDist(val))
  }, [])

  // Camera fly-to (position + distance)
  const [flyToWorldPos, setFlyToWorldPos] = useState<THREE.Vector3 | null>(null)
  const [flyToDist,     setFlyToDist]     = useState(1.0)

  // AI — first explanation
  const [aiResponse,  setAiResponse]  = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const aiAbortRef                    = useRef<AbortController | null>(null)

  // AI — follow-up chat
  const [chatHistory,       setChatHistory]       = useState<AIChatMessage[]>([])
  const [followUpStreaming,  setFollowUpStreaming] = useState('')
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false)
  const followUpAbortRef                          = useRef<AbortController | null>(null)
  const conversationRef                           = useRef<{ role: string; content: string }[]>([])
  const [aiScrollTick, setAiScrollTick]           = useState(0)

  // Tooltip
  const [tooltip, setTooltip] = useState({ name: null as string | null, x: 0, y: 0, visible: false })

  // Reset AI state when selection changes — skipped when restoring from history
  useEffect(() => {
    if (isHistoryLoadRef.current) {
      isHistoryLoadRef.current = false
      return
    }
    setAiResponse('')
    setChatHistory([])
    setFollowUpStreaming('')
    conversationRef.current = []
    aiAbortRef.current?.abort()
    followUpAbortRef.current?.abort()
  }, [selectedMeshName])

  // ── Canvas dimensions ──────────────────────────────────────────────────
  const canvasWidth  = bp === 'desktop' ? vw - 280 - 360 : vw
  const canvasHeight = bp === 'mobile' ? vh - 56 : bp === 'tablet' ? vh - 60 : vh
  const canvasLeft   = bp === 'desktop' ? 280 : 0
  const canvasTop    = bp === 'mobile' ? 56 : bp === 'tablet' ? 60 : 0

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleToggleGroup = useCallback((key: string) => {
    setVisibleGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleMeshSelect = useCallback((obj: THREE.Object3D) => {
    setSelectedMeshName(obj.name)
    setSelectedPart(findPartByMeshName(obj.name))
    setSelectedModelKey((obj.userData.modelKey as ModelKey) ?? null)
    if (bp !== 'desktop') setBottomSheetState('pill')
  }, [bp])

  const handleMeshHover = useCallback((obj: THREE.Object3D | null) => {
    if (!obj) {
      setHoveredMeshName(null)
      setTooltip(prev => ({ ...prev, visible: false }))
      return
    }
    setHoveredMeshName(obj.name)
    const part  = findPartByMeshName(obj.name)
    const label = part?.name ?? formatMeshLabel(obj.name)
    setTooltip({ name: label, x: 0, y: 0, visible: true })
  }, [])

  const handlePointerMove = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => prev.visible ? { ...prev, x: e.clientX, y: e.clientY } : prev)
  }, [])

  const handleFlyToMesh = useCallback((worldPos: THREE.Vector3, zoomDist: number) => {
    setFlyToWorldPos(worldPos.clone())
    setFlyToDist(zoomDist)
  }, [])

  const handleFlyComplete = useCallback(() => {
    setFlyToWorldPos(null)
    setSliderZoom(distToZoom(flyToDist))
  }, [flyToDist])

  const handleResetView = useCallback(() => {
    setSelectedMeshName(null)
    setSelectedPart(null)
    setSelectedModelKey(null)
    setBottomSheetState('hidden')
    const resetDist = bp === 'mobile' ? 5.5 : bp === 'tablet' ? 5.0 : 4.5
    setFlyToWorldPos(new THREE.Vector3(0, 1, 0))
    setFlyToDist(resetDist)
    setSliderZoom(distToZoom(resetDist))
  }, [bp])

  const handlePartSelect = useCallback((part: AnatomyPart) => {
    setSelectedMeshName(part.meshNames[0] ?? part.id)
    setSelectedPart(part)
    setSelectedModelKey(part.modelFile)
    if (bp !== 'desktop') setBottomSheetState('pill')
    const [, cy] = part.cameraPosition
    setFlyToWorldPos(new THREE.Vector3(0, cy, 0))
    setFlyToDist(1.2)
    setSliderZoom(distToZoom(1.2))
  }, [bp])

  // ── History: load a saved session ─────────────────────────────────────
  const handleHistoryLoad = useCallback((session: AnatomySession) => {
    const part = ANATOMY_PARTS.find(p =>
      p.meshNames.some(m => m === session.mesh_name) || p.name === session.part_name
    ) ?? null

    // Flag tells the selectedMeshName effect to skip its reset this one time
    isHistoryLoadRef.current = true

    setSelectedMeshName(session.mesh_name)
    setSelectedPart(part)
    setSelectedModelKey(session.model_key as ModelKey)
    setAiResponse(session.ai_response)
    setChatHistory(session.chat_history)
    sessionIdRef.current = session.id
    conversationRef.current = [
      { role: 'system', content: 'You are an expert anatomy tutor. Respond in clear, well-structured Markdown with headers and bullet points. Be educational but concise.' },
      { role: 'user', content: `Explain ${session.part_name} in anatomy.` },
      { role: 'assistant', content: session.ai_response },
      ...session.chat_history.map(m => ({ role: m.role, content: m.content })),
    ]

    // Determine the layer group by reverse-looking up which group owns the saved model_key.
    // This is more reliable than part_system because model_key is stamped from the 3D object
    // and is never defaulted to 'reference' incorrectly.
    const modelKeyForLayer = session.model_key as ModelKey
    const layerKey =
      Object.keys(LAYER_GROUPS).find(k =>
        (LAYER_GROUPS[k].models as readonly string[]).includes(modelKeyForLayer)
      ) ?? part?.system
    if (layerKey && LAYER_GROUPS[layerKey]) {
      setVisibleGroups(new Set([layerKey]))
    }

    // Zoom into the part — always fires; falls back to body centre if part not in ANATOMY_PARTS
    const [, cy] = part?.cameraPosition ?? [0, 1]
    setFlyToWorldPos(new THREE.Vector3(0, cy, 0))
    setFlyToDist(1.2)
    setSliderZoom(distToZoom(1.2))

    if (bp !== 'desktop') setBottomSheetState('expanded')
  }, [bp])

  // ── AI: initial explanation ────────────────────────────────────────────
  const handleAskAI = useCallback(async () => {
    if (!canUse('anatomy_chat')) { toast.error('Not enough tokens'); return }

    aiAbortRef.current?.abort()
    const ctrl = new AbortController()
    aiAbortRef.current = ctrl
    setAiResponse('')
    setIsLoadingAI(true)

    try {
      await spend('anatomy_chat')
    } catch {
      toast.error('Not enough tokens')
      setIsLoadingAI(false)
      return
    }

    const partContext = selectedPart
      ? `${selectedPart.name} (${selectedPart.latinName}), located in ${selectedPart.location}. Function: ${selectedPart.function}.`
      : `a structure labelled "${selectedMeshName}" from a 3D human anatomy model`

    const systemMsg = { role: 'system' as const, content: `You are an expert anatomy tutor. Respond in clear, well-structured Markdown with headers and bullet points. Be educational but concise.` }
    const userMsg   = { role: 'user'   as const, content: `Give me a complete educational breakdown of ${partContext} covering: (1) Structure & Anatomy, (2) Function & Physiology, (3) Clinical Significance, (4) Key Relationships to nearby structures. Use ## headers and bullet points.` }

    conversationRef.current = [systemMsg, userMsg]

    let full = ''
    try {
      for await (const chunk of groqStream([systemMsg, userMsg], GROQ_MODELS.fast, ctrl.signal)) {
        full += chunk
        setAiResponse(full)
      }
      conversationRef.current.push({ role: 'assistant', content: full })
      setAiScrollTick(t => t + 1)

      // Persist session to Supabase (non-blocking)
      if (profile?.id) {
        const partName   = selectedPart?.name ?? (selectedMeshName ? formatMeshLabel(selectedMeshName) : 'Unknown')
        const modelKey   = selectedModelKey ?? selectedPart?.modelFile ?? 'skeleton'
        supabase.from('anatomy_chats').insert({
          user_id: profile.id,
          mesh_name: selectedMeshName ?? '',
          part_name: partName,
          part_system: selectedPart?.system ?? 'reference',
          model_key: modelKey,
          ai_response: full,
          chat_history: [],
        }).select('id').single().then(({ data }) => {
          if (data) { sessionIdRef.current = data.id; invalidateHistory() }
        })
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast.error('AI request failed')
    } finally {
      setIsLoadingAI(false)
      aiAbortRef.current = null
    }
  }, [selectedPart, selectedMeshName, selectedModelKey, canUse, spend, profile, invalidateHistory])

  // ── AI: follow-up ──────────────────────────────────────────────────────
  const handleFollowUp = useCallback(async (question: string) => {
    if (!question.trim()) return
    if (!canUse('anatomy_chat')) { toast.error('Not enough tokens'); return }

    followUpAbortRef.current?.abort()
    const ctrl = new AbortController()
    followUpAbortRef.current = ctrl

    setChatHistory(prev => [...prev, { role: 'user', content: question }])
    setIsLoadingFollowUp(true)
    setFollowUpStreaming('')

    try {
      await spend('anatomy_chat')
    } catch {
      toast.error('Not enough tokens')
      setIsLoadingFollowUp(false)
      return
    }

    conversationRef.current.push({ role: 'user' as const, content: question })

    let full = ''
    try {
      for await (const chunk of groqStream(conversationRef.current as any, GROQ_MODELS.fast, ctrl.signal)) {
        full += chunk
        setFollowUpStreaming(full)
      }
      conversationRef.current.push({ role: 'assistant', content: full })
      setChatHistory(prev => [...prev, { role: 'assistant', content: full }])
      setFollowUpStreaming('')
      setAiScrollTick(t => t + 1)

      // Update saved session with new chat history (skip system + initial exchange)
      if (sessionIdRef.current) {
        const followUps = conversationRef.current.slice(3).map(m => ({
          role: m.role as 'user' | 'assistant', content: m.content,
        }))
        supabase.from('anatomy_chats').update({ chat_history: followUps })
          .eq('id', sessionIdRef.current).then(() => invalidateHistory())
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast.error('Follow-up failed')
      conversationRef.current.pop()
      setChatHistory(prev => prev.slice(0, -1))
    } finally {
      setIsLoadingFollowUp(false)
      followUpAbortRef.current = null
    }
  }, [canUse, spend, invalidateHistory])

  const displayName = selectedPart?.name ?? (selectedMeshName ? formatMeshLabel(selectedMeshName) : null)

  // Effective model key: prefer the one stamped on the mesh, fall back to part data
  const effectiveModelKey = selectedModelKey ?? selectedPart?.modelFile ?? null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0A0A0F', overflow: 'hidden' }}
      onMouseMove={bp === 'desktop' ? handlePointerMove : undefined}
    >
      {showWarning && (
        <DeviceWarningModal onContinue={() => setShowWarning(false)} />
      )}

      {bp === 'desktop' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', zIndex: 50,
          background: 'rgba(255,255,255,0.04)', borderRight: '0.5px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)', overflow: 'hidden',
        }}>
          <ControlPanel
            bp={bp} visibleGroups={visibleGroups} loadingGroups={loadingGroups}
            opacity={opacity} onToggleGroup={handleToggleGroup}
            onOpacityChange={setOpacity} onResetView={handleResetView}
            onPartSelect={handlePartSelect}
            onHistoryLoad={handleHistoryLoad}
          />
        </div>
      )}

      {bp !== 'desktop' && (
        <TopBar
          bp={bp}
          subtitle={displayName ?? (searchQuery ? `Searching: ${searchQuery}` : '')}
          isDrawerOpen={isDrawerOpen}
          visibleGroups={visibleGroups}
          onToggleDrawer={() => setIsDrawerOpen(o => !o)}
          onToggleGroup={handleToggleGroup}
        />
      )}

      <div style={{
        position: 'fixed', top: canvasTop, left: canvasLeft,
        width: canvasWidth, height: canvasHeight, zIndex: 10, overflow: 'hidden',
      }}>
        <BodyCanvas
          width={canvasWidth} height={canvasHeight} bp={bp}
          visibleGroups={visibleGroups} opacity={opacity}
          selectedMeshName={selectedMeshName} hoveredMeshName={hoveredMeshName}
          onMeshSelect={handleMeshSelect} onMeshHover={handleMeshHover}
          flyToWorldPos={flyToWorldPos} flyToDist={flyToDist}
          onFlyComplete={handleFlyComplete} onFlyToMesh={handleFlyToMesh}
          onZoomRegister={onZoomRegister}
        />
      </div>

      {bp === 'desktop' && (
        <>
          {/* Vertical zoom slider — floats at right edge of canvas */}
          <div style={{
            position: 'fixed', right: 372, top: '50%', transform: 'translateY(-50%)',
            zIndex: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            background: 'rgba(10,22,40,0.88)',
            border: '0.5px solid rgba(255,255,255,0.09)',
            borderRadius: 12, padding: '10px 7px',
            backdropFilter: 'blur(16px)',
          }}>
            <span style={{ color: '#38E0C3', fontSize: 14, lineHeight: 1, userSelect: 'none' }}>+</span>
            <input
              type="range" min="0" max="1" step="0.02"
              value={sliderZoom}
              onChange={e => handleSlider(Number(e.target.value))}
              style={{
                writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
                direction: 'rtl' as React.CSSProperties['direction'],
                height: 90, cursor: 'pointer',
                accentColor: '#38E0C3',
                background: 'transparent',
                WebkitAppearance: 'slider-vertical',
              } as React.CSSProperties}
            />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, lineHeight: 1, userSelect: 'none' }}>−</span>
          </div>

          <InfoPanel
            part={selectedPart}
            selectedMeshName={selectedMeshName}
            selectedModelKey={effectiveModelKey}
            onAskAI={handleAskAI}
            aiResponse={aiResponse}
            isLoadingAI={isLoadingAI}
            chatHistory={chatHistory}
            followUpStreaming={followUpStreaming}
            isLoadingFollowUp={isLoadingFollowUp}
            onFollowUp={handleFollowUp}
            canAskAI={canUse('anatomy_chat')}
            chatCost={getCost('anatomy_chat')}
            aiScrollTick={aiScrollTick}
            onDeepDive={() => { setAiScrollTick(t => t + 1) }}
          />
        </>
      )}

      {bp !== 'desktop' && (
        <Drawer
          isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}
          visibleGroups={visibleGroups} loadingGroups={loadingGroups}
          opacity={opacity} onToggleGroup={handleToggleGroup}
          onOpacityChange={setOpacity} onResetView={handleResetView}
          onPartSelect={part => { handlePartSelect(part); setIsDrawerOpen(false) }}
          onHistoryLoad={session => { handleHistoryLoad(session); setIsDrawerOpen(false) }}
        />
      )}

      {bp !== 'desktop' && (
        <BottomSheet
          state={bottomSheetState}
          part={selectedPart}
          selectedMeshName={selectedMeshName}
          selectedModelKey={effectiveModelKey}
          onStateChange={setBottomSheetState}
          aiResponse={aiResponse}
          isLoadingAI={isLoadingAI}
          chatHistory={chatHistory}
          followUpStreaming={followUpStreaming}
          isLoadingFollowUp={isLoadingFollowUp}
          onAskAI={handleAskAI}
          onFollowUp={handleFollowUp}
          canAskAI={canUse('anatomy_chat')}
          chatCost={getCost('anatomy_chat')}
        />
      )}

      {/* Z-Anatomy credit — mobile/tablet */}
      {bp !== 'desktop' && (
        <div style={{
          position: 'fixed', bottom: 90, left: 12, zIndex: 5,
          color: 'rgba(255,255,255,0.15)', fontSize: 8.5,
          letterSpacing: '0.03em', pointerEvents: 'none',
        }}>
          Models: <span style={{ color: 'rgba(56,224,195,0.3)' }}>Z-Anatomy</span>
        </div>
      )}

      {bp === 'desktop' && (
        <HoverTooltip name={tooltip.name} x={tooltip.x} y={tooltip.y} visible={tooltip.visible} />
      )}
    </div>
  )
}
