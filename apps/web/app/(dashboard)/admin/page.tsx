'use client'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Exam = {
  id: string
  title: string
  description: string | null
  createdAt: string
  _count: { sessions: number }
}

type User = {
  id: string
  name: string
  email: string
  role: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/login'); return }
    const parsedUser = JSON.parse(stored)
    if (parsedUser.role !== 'ADMIN') { router.push('/login'); return }
    setUser(parsedUser)
  }, [])

  useEffect(() => {
    if (!user) return
    fetchExams()
  }, [user])

  const fetchExams = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:4000/api/exams', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.exams) setExams(data.exams)
  }

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:4000/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to create exam'); return }
      setExams(prev => [{ ...data.exam, _count: { sessions: 0 } }, ...prev])
      setFormData({ title: '', description: '' })
      setShowForm(false)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

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
            <span className="text-xs bg-gray-900 text-white px-2 py-1 rounded-full">ADMIN</span>
            <button
              onClick={() => { localStorage.clear(); router.push('/login') }}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Exams</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{exams.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Sessions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {exams.reduce((acc, e) => acc + e._count.sessions, 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Organisation</p>
            <p className="text-lg font-bold text-gray-900 mt-1 truncate">atomcamp Arabia</p>
          </div>
        </div>

        {/* Exams section */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Exams</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              {showForm ? 'Cancel' : '+ New Exam'}
            </button>
          </div>

          {/* Create exam form */}
          {showForm && (
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <form onSubmit={handleCreateExam} className="space-y-3">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Exam Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. Mid-Term Assessment Q1 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Brief description of this exam"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Exam'}
                </button>
              </form>
            </div>
          )}

          {/* Exam list */}
          {exams.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-400 text-sm">No exams yet. Create your first exam above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {exams.map(exam => (
                <div key={exam.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                    {exam.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{exam.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Created {new Date(exam.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Sessions</p>
                      <p className="text-sm font-bold text-gray-900">{exam._count.sessions}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exam.id)
                        alert(`Exam ID copied: ${exam.id}`)
                      }}
                      className="text-xs text-gray-400 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}