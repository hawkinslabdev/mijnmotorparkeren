// src/hooks/useKeyboardShortcuts.ts

import { useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  callback: () => void
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      for (const shortcut of shortcuts) {
        const {
          key,
          ctrlKey = false,
          metaKey = false,
          shiftKey = false,
          altKey = false,
          callback,
          preventDefault = true
        } = shortcut

        // Check if all modifiers match
        const modifiersMatch = 
          event.ctrlKey === ctrlKey &&
          event.metaKey === metaKey &&
          event.shiftKey === shiftKey &&
          event.altKey === altKey

        // Check if key matches (case insensitive)
        const keyMatches = event.key.toLowerCase() === key.toLowerCase()

        if (modifiersMatch && keyMatches) {
          if (preventDefault) {
            event.preventDefault()
          }
          callback()
          break // Only trigger the first matching shortcut
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, enabled])
}