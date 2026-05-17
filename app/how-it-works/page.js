'use client'
import { useEffect } from 'react'

export default function HowItWorks() {
  useEffect(() => {
    // Remove Next.js default margin
    document.body.style.margin = '0'
  }, [])

  return (
    <iframe
      src="/how-it-works.html"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="How DabbaBook Works"
    />
  )
}
