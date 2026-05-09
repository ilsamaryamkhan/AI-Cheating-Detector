import { useEffect, useRef, useState, useCallback } from 'react'

export type KeystrokeEvent = {
  type: 'PASTE_DETECTED' | 'COPY_DETECTED' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'RAPID_TYPING' | 'SUSPICIOUS_PASTE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  message: string
  timestamp: string
}

export function useKeystrokeDetection(active: boolean) {
  const [events, setEvents] = useState<KeystrokeEvent[]>([])

  const keyTimestamps = useRef<number[]>([])
  const lastKeyTime = useRef<number>(0)
  const tabSwitchCount = useRef(0)

  const addEvent = useCallback((event: KeystrokeEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 100))
  }, [])

  useEffect(() => {
    if (!active) return

    // Paste detection
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || ''
      const wordCount = text.trim().split(/\s+/).length

      if (wordCount > 20) {
        addEvent({
          type: 'SUSPICIOUS_PASTE',
          severity: 'HIGH',
          message: `Large paste detected — ${wordCount} words pasted at once`,
          timestamp: new Date().toISOString(),
        })
      } else {
        addEvent({
          type: 'PASTE_DETECTED',
          severity: 'MEDIUM',
          message: `Paste detected — ${wordCount} words`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Copy detection
    const handleCopy = () => {
      addEvent({
        type: 'COPY_DETECTED',
        severity: 'LOW',
        message: 'Candidate copied text from exam',
        timestamp: new Date().toISOString(),
      })
    }

    // Tab switch / window blur
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current += 1
        addEvent({
          type: 'TAB_SWITCH',
          severity: 'HIGH',
          message: `Tab switch detected — ${tabSwitchCount.current} total switches`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Window blur
    const handleBlur = () => {
      addEvent({
        type: 'WINDOW_BLUR',
        severity: 'MEDIUM',
        message: 'Exam window lost focus',
        timestamp: new Date().toISOString(),
      })
    }

    // Rapid typing detection
    const handleKeydown = (e: KeyboardEvent) => {
      const now = Date.now()
      const timeSinceLastKey = now - lastKeyTime.current

      if (lastKeyTime.current > 0 && timeSinceLastKey < 30) {
        keyTimestamps.current.push(timeSinceLastKey)

        // Check last 20 keystrokes for suspicious speed
        if (keyTimestamps.current.length >= 20) {
          const recent = keyTimestamps.current.slice(-20)
          const avgInterval = recent.reduce((a, b) => a + b, 0) / recent.length

          if (avgInterval < 40) {
            addEvent({
              type: 'RAPID_TYPING',
              severity: 'MEDIUM',
              message: 'Unusually rapid typing detected — possible automated input',
              timestamp: new Date().toISOString(),
            })
            keyTimestamps.current = []
          }
        }
      }

      lastKeyTime.current = now
    }

    // Register all listeners
    document.addEventListener('paste', handlePaste)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [active, addEvent])

  return { events }
}