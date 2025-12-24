'use client'

import { useEffect, useRef } from 'react'

function isWeChatEnv() {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent || '')
}

function getWeChatSignUrl() {
  if (typeof window === 'undefined') return ''
  const currentUrl = window.location.href.split('#')[0]
  const ua = window.navigator?.userAgent || ''
  const isIOS = /iphone|ipad|ipod/i.test(ua)

  try {
    const key = 'wx_sign_url'
    const stored = window.sessionStorage.getItem(key)
    if (!stored) {
      window.sessionStorage.setItem(key, currentUrl)
      return currentUrl
    }
    return isIOS ? stored : currentUrl
  } catch {
    return currentUrl
  }
}

async function ensureWxReady() {
  if (typeof window === 'undefined') return null
  let wx = (window as any).wx
  if (!wx) {
    const start = Date.now()
    while (!wx && Date.now() - start < 2500) {
      await new Promise((r) => setTimeout(r, 50))
      wx = (window as any).wx
    }
  }
  return wx || null
}

function toAbsoluteUrl(input: string) {
  const v = (input || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (typeof window === 'undefined') return v
  const base = window.location.origin.replace(/\/+$/, '')
  return `${base}${v.startsWith('/') ? v : `/${v}`}`
}

function truncateText(input: string, maxLen: number) {
  const s = (input || '').trim()
  if (!s) return ''
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen)}…`
}

export type WeChatShareData = {
  title: string
  desc?: string
  link?: string
  imgUrl?: string
}

export function useWeChatShare(data: WeChatShareData | null, opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true
  const lastKeyRef = useRef<string>('')

  useEffect(() => {
    if (!enabled) return
    if (!data?.title) return
    if (!isWeChatEnv()) return

    const key = JSON.stringify({
      t: data.title,
      d: data.desc || '',
      l: data.link || '',
      i: data.imgUrl || '',
    })
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key

    let cancelled = false

    ;(async () => {
      const wx = await ensureWxReady()
      if (cancelled || !wx) return

      const signUrl = getWeChatSignUrl()
      const cfgRes = await fetch(`/api/wechat/js-sdk-config?url=${encodeURIComponent(signUrl)}`, { cache: 'no-store' })
      const cfgJson = (await cfgRes.json().catch(() => null)) as any
      if (!cfgRes.ok || !cfgJson?.success || !cfgJson?.data) return

      const cfg = cfgJson.data as { appId: string; timestamp: number; nonceStr: string; signature: string }
      const link = (data.link || (typeof window !== 'undefined' ? window.location.href : '')).split('#')[0]
      const imgUrl = toAbsoluteUrl(data.imgUrl || '/images/portal-tech.jpg')
      const title = truncateText(data.title, 48)
      const desc = truncateText(data.desc || data.title, 80)

      await new Promise<void>((resolve, reject) => {
        try {
          wx.config({
            debug: false,
            appId: cfg.appId,
            timestamp: cfg.timestamp,
            nonceStr: cfg.nonceStr,
            signature: cfg.signature,
            jsApiList: [
              'checkJsApi',
              'updateAppMessageShareData',
              'updateTimelineShareData',
              // 兼容老版本
              'onMenuShareAppMessage',
              'onMenuShareTimeline',
            ],
            openTagList: ['wx-open-subscribe'],
          })
          wx.ready(() => resolve())
          wx.error((err: any) => reject(err))
        } catch (e) {
          reject(e)
        }
      }).catch(() => null)

      if (cancelled) return

      try {
        if (typeof wx.updateAppMessageShareData === 'function') {
          wx.updateAppMessageShareData({ title, desc, link, imgUrl })
        }
        if (typeof wx.updateTimelineShareData === 'function') {
          wx.updateTimelineShareData({ title, link, imgUrl })
        }
        if (typeof wx.onMenuShareAppMessage === 'function') {
          wx.onMenuShareAppMessage({ title, desc, link, imgUrl })
        }
        if (typeof wx.onMenuShareTimeline === 'function') {
          wx.onMenuShareTimeline({ title, link, imgUrl })
        }
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [data, enabled])
}

export function getWeChatShareHint(locale: 'zh' | 'en') {
  return locale === 'en'
    ? 'Please tap the top-right menu (⋯) to share.'
    : '请点击右上角“…”进行分享'
}

