'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (!stored || !token) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(stored)
    if (parsedUser.role !== 'ADMIN') {
      router.push('/login')
      return
    }

    setUser(parsedUser)
  }, [])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">atomcamp</h1>
            <p className="text-xs text-gray-500">AI Proctoring System</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name}</span>
            <span className="text-xs bg-gray-900 text-white px-2 py-1 rounded-full">
              {user.role}
            </span>
            <button
              onClick={() => {
                localStorage.clear()
                router.push('/login')
              }}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Admin Dashboard
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user.name}. Manage your organisation below.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Exams</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Active Sessions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
          </div>
        </div>

        {/* Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">
            Exam management and user controls coming in the next phase.
          </p>
        </div>
      </main>
    </div>
  )
}