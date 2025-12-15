"use client"

import { createContext, useContext, useMemo, useRef, useState, useCallback } from 'react'
import Image from 'next/image'

interface LoadingOverlayContextValue {
  showLoading: (message?: string) => void
  hideLoading: () => void
  resetLoading: () => void
}

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(null)

export function LoadingOverlayProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '加载中...'
  })
  const counterRef = useRef(0)

  const showLoading = useCallback((message?: string) => {
    counterRef.current += 1
    setState((prev) => ({
      visible: true,
      message: message || prev.message || '加载中...'
    }))
  }, [])

  const hideLoading = useCallback(() => {
    counterRef.current = Math.max(0, counterRef.current - 1)
    if (counterRef.current === 0) {
      setState({ visible: false, message: '加载中...' })
    }
  }, [])

  const resetLoading = useCallback(() => {
    counterRef.current = 0
    setState({ visible: false, message: '加载中...' })
  }, [])

  const value = useMemo<LoadingOverlayContextValue>(
    () => ({ showLoading, hideLoading, resetLoading }),
    [showLoading, hideLoading, resetLoading],
  )

  return (
    <LoadingOverlayContext.Provider value={value}>
      {children}
      {state.visible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex w-[220px] flex-col items-center gap-3 rounded-2xl bg-white px-6 py-6 shadow-xl">
            <Image src="/images/icons/loading.gif" alt="loading" width={64} height={64} priority />
            <span className="text-sm text-gray-600">{state.message}</span>
          </div>
        </div>
      )}
    </LoadingOverlayContext.Provider>
  )
}

export function useLoadingOverlay() {
  const context = useContext(LoadingOverlayContext)
  if (!context) {
    throw new Error('useLoadingOverlay must be used within LoadingOverlayProvider')
  }
  return context
}
