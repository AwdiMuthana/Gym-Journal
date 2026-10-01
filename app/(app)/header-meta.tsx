'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Renders a screen's meta line into the mobile header's right-hand slot.
export default function HeaderMeta({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    function sync() {
      setTarget(document.getElementById('header-meta'))
    }
    sync()
  }, [])
  return target ? createPortal(children, target) : null
}
