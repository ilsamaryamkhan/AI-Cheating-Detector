'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProctorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/login'); return }
    const parsedUser = JSON.parse(stored)
    if (parsedUser.role !== 'PROCTOR') { router.push('/login'); return }
    setUser(parsedUser)
  }, [])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">atomcamp</h1>
            <p className="text-xs text-gray-500">AI Proctoring System</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name}</span>
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">PROCTOR</span>
            <button onClick={() => { localStorage.clear(); router.push('/login') }}
              className="text-sm text-gray-500 hover:text-gray-900">Sign out</button>
          </div>
        </div>
      </header>
      <main className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Proctor Dashboard</h2>
        <p className="text-sm text-gray-500 mb-6">Monitor live exam sessions below.</p>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">Live session monitoring coming in Phase 5.</p>
        </div>
      </main>
    </div>
  )
}