import { useState, useEffect } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export function useBreakpoint(): Breakpoint {
  const getBreakpoint = (w: number): Breakpoint =>
    w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'

  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'desktop'
  )

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) =>
      setBp(getBreakpoint(entry.contentRect.width))
    )
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [])

  return bp
}
