'use client'

import { useEffect } from 'react'

export function WeChatShareHintOverlay({
  open,
  onClose,
  locale,
}: {
  open: boolean
  onClose: () => void
  locale: 'zh' | 'en'
}) {
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => onClose(), 3500)
    return () => window.clearTimeout(t)
  }, [open, onClose])

  if (!open) return null

  const text =
    locale === 'en' ? 'Please tap the top-right menu "⋯" to share' : '请点击右上角“…”进行分享'

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="absolute top-3 left-0 right-0 flex justify-center px-3 pointer-events-none">
        <div className="w-full max-w-md">
          <div className="pointer-events-auto relative flex items-center gap-2 rounded-xl bg-white shadow-lg border border-gray-100 px-3 py-2">
            <div className="text-[13px] text-gray-900 font-medium leading-snug">{text}</div>
            <div className="ml-auto shrink-0 text-[#00b899]">
              <svg
                aria-hidden="true"
                viewBox="0 0 120 50"
                className="w-[92px] h-[38px]"
                fill="none"
              >
                <path
                  d="M6 44 C 34 18, 60 16, 102 8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M88 6 L102 8 L94 20"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

