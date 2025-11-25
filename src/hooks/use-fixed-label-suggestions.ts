'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FixedLabelOption, getFixedLabelMeta, matchFixedLabels } from '@/lib/fixed-labels'

export function useFixedLabelSuggestions(value: string, onSelect: (label: string) => void) {
  const [suggestions, setSuggestions] = useState<FixedLabelOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const matchedLabel = useMemo(() => getFixedLabelMeta(value), [value])

  useEffect(() => {
    const query = value.trim()
    if (!query) {
      setSuggestions([])
      return
    }
    setSuggestions(matchFixedLabels(query, 8))
  }, [value])

  useEffect(() => {
    if (suggestions.length === 0) {
      setIsOpen(false)
    }
  }, [suggestions.length])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true)
    }
  }

  const handleSelect = (option: FixedLabelOption) => {
    onSelect(option.label)
    setIsOpen(false)
  }

  return {
    suggestions,
    isOpen,
    setIsOpen,
    containerRef,
    matchedLabel,
    handleFocus,
    handleSelect
  }
}
