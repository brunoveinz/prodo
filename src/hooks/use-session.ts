'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (!res.ok) {
          router.push('/login')
          return
        }
        const data = await res.json()
        setSession(data)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [router])

  return { session, loading }
}
