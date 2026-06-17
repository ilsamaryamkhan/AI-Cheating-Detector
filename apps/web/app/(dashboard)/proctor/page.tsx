'use client'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'

type SessionCard = {
  sessionId: string
  candidateName: string
  examTitle: string
  riskScore: number
  flagCount: number
  status: 'active' | 'completed'
  startedAt: string
  latestEvent?: {
    type: string
    severity: string
    message: string
  }
}

type User = {
  id: string
  name: string
  email: string
  role: string
  organisationId: string
}

export default function ProctorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<SessionCard[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/login'); return }
    const parsedUser = JSON.parse(stored)
    if (parsedUser.role !== 'PROCTOR' && parsedUser.role !== 'ADMIN') {
      router.push('/login'); return
    }
    setUser(parsedUser)
  }, [])

  // Load existing sessions
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('token')
    fetch('${API_URL}/api/sessions/proctor', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.sessions) {
          setSessions(data.sessions.map((s: any) => ({
            sessionId: s.id,
            candidateName: s.candidate.name,
            examTitle: s.exam.title,
            riskScore: s.riskScore,
            flagCount: s.flagCount,
            status: s.status,
            startedAt: s.startedAt,
          })))
        }
      })
  }, [user])

  // Connect Socket.io
  useEffect(() => {
    if (!user) return

    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      setConnected(true)
      newSocket.emit('proctor:join', user.organisationId)
    })

    newSocket.on('disconnect', () => setConnected(false))

    // New session started
    newSocket.on('session:started', (data: SessionCard) => {
      setSessions(prev => {
        const exists = prev.find(s => s.sessionId === data.sessionId)
        if (exists) return prev
        return [data, ...prev]
      })
      setNotifications(prev => [
        `${data.candidateName} started ${data.examTitle}`,
        ...prev.slice(0, 4),
      ])
    })

    // Live risk score update
    newSocket.on('session:update', (data: any) => {
      setSessions(prev => prev.map(s =>
        s.sessionId === data.sessionId
          ? { ...s, riskScore: data.riskScore, flagCount: data.flagCount, latestEvent: data.latestEvent }
          : s
      ))
    })

    // Session ended
    newSocket.on('session:ended', (data: any) => {
      setSessions(prev => prev.map(s =>
        s.sessionId === data.sessionId
          ? { ...s, status: 'completed', riskScore: data.riskScore, flagCount: data.flagCount }
          : s
      ))
      setNotifications(prev => [
        `${data.candidateName} submitted — ${data.verdict} (Score: ${data.riskScore})`,
        ...prev.slice(0, 4),
      ])
    })

    setSocket(newSocket)
    return () => { newSocket.disconnect() }
  }, [user])

  const riskColor = (score: number) =>
    score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981'

  const riskBg = (score: number) =>
    score >= 70 ? 'border-red-500 bg-red-950/20' :
    score >= 40 ? 'border-yellow-500 bg-yellow-950/20' :
    'border-gray-700 bg-gray-800'

  const riskLabel = (score: number) =>
    score >= 70 ? 'HIGH RISK' : score >= 40 ? 'MEDIUM' : 'LOW'

  const activeSessions = sessions.filter(s => s.status === 'active')
  const completedSessions = sessions.filter(s => s.status === 'completed')

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Topbar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-white font-semibold">atomcamp</span>
            <span className="text-gray-500 text-xs ml-2">Proctor Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">{connected ? 'Live' : 'Disconnected'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user.name}</span>
          <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">PROCTOR</span>
          <button
            onClick={() => { localStorage.clear(); router.push('/login') }}
            className="text-xs text-gray-500 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-52px)]">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="mb-4 space-y-2">
              {notifications.map((note, i) => (
                <div key={i} className="bg-blue-900/30 border border-blue-700 rounded-lg px-4 py-2 text-sm text-blue-300 flex items-center justify-between">
                  <span>🔔 {note}</span>
                  <button onClick={() => setNotifications(prev => prev.filter((_, j) => j !== i))}
                    className="text-blue-500 hover:text-white ml-4">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <p className="text-xs text-gray-400 mb-1">Active Sessions</p>
              <p className="text-2xl font-bold text-green-400">{activeSessions.length}</p>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <p className="text-xs text-gray-400 mb-1">Completed Today</p>
              <p className="text-2xl font-bold text-white">{completedSessions.length}</p>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <p className="text-xs text-gray-400 mb-1">High Risk</p>
              <p className="text-2xl font-bold text-red-400">
                {sessions.filter(s => s.riskScore >= 70).length}
              </p>
            </div>
          </div>

          {/* Active sessions */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Active Sessions ({activeSessions.length})
            </h2>
            {activeSessions.length === 0 ? (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                <p className="text-gray-500 text-sm">No active sessions. Waiting for candidates to start their exams.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeSessions.map(session => (
                  <div
                    key={session.sessionId}
                    onClick={() => setSelectedSession(
                      selectedSession === session.sessionId ? null : session.sessionId
                    )}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${riskBg(session.riskScore)} ${
                      selectedSession === session.sessionId ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-white text-sm">{session.candidateName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{session.examTitle}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-400">LIVE</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Risk</p>
                        <p className="text-lg font-bold" style={{ color: riskColor(session.riskScore) }}>
                          {session.riskScore}
                        </p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Flags</p>
                        <p className="text-lg font-bold text-white">{session.flagCount}</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="text-xs font-bold mt-1" style={{ color: riskColor(session.riskScore) }}>
                          {riskLabel(session.riskScore)}
                        </p>
                      </div>
                    </div>

                    {/* Risk bar */}
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${session.riskScore}%`,
                          background: riskColor(session.riskScore),
                        }}
                      />
                    </div>

                    {session.latestEvent && (
                      <p className="text-xs text-gray-500 mt-2 truncate">
                        ↳ {session.latestEvent.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed sessions */}
          {completedSessions.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Completed Sessions ({completedSessions.length})
              </h2>
              <div className="space-y-2">
                {completedSessions.map(session => (
                  <div key={session.sessionId}
                    className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{session.candidateName}</p>
                      <p className="text-xs text-gray-400">{session.examTitle}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Risk Score</p>
                        <p className="font-bold" style={{ color: riskColor(session.riskScore) }}>
                          {session.riskScore}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Flags</p>
                        <p className="font-bold text-white">{session.flagCount}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        session.riskScore >= 70 ? 'bg-red-900/50 text-red-400' :
                        session.riskScore >= 40 ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-green-900/50 text-green-400'
                      }`}>
                        {riskLabel(session.riskScore)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}