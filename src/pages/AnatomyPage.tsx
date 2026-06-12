import { useEffect } from 'react'
import { AnatomyLayout } from '@/components/anatomy/AnatomyLayout'

export default function AnatomyPage() {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width    = '100%'
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width    = ''
    }
  }, [])

  return <AnatomyLayout />
}
