'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFaceDetection } from '../../hooks/useFaceDetection'
import { createSession, logEvent, endSession } from '../../lib/api'

type User = {
  id: string
  name: string
  email: string
  role: string
}

export default function ExamPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [phase, setPhase] = useState<'consent' | 'active' | 'ended'>('consent')
  const [elapsed, setElapsed] = useState(0)
  const [riskScore, setRiskScore] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const processedEvents = useRef<Set<string>>(new Set())

  const { status, events, absenceSeconds } = useFaceDetection(
    videoRef,
    canvasRef,
    phase === 'active'
  )

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/login'); return }
    setUser(JSON.parse(stored))
  }, [])

  // Start session when exam becomes active
  useEffect(() => {
    if (phase === 'active' && !sessionId) {
      createSession('demo-exam-001').then(data => {
        if (data.session) {
          setSessionId(data.session.id)
          console.log('Session created:', data.session.id)
        }
      })
    }
  }, [phase, sessionId])

  // Start timer
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  // Save events to database as they come in
  useEffect(() => {
    if (!sessionId || events.length === 0) return

    events.forEach(event => {
      const key = `${event.type}-${event.timestamp}`
      if (!processedEvents.current.has(key)) {
        processedEvents.current.add(key)
        logEvent(sessionId, {
          type: event.type,
          severity: event.severity,
          message: event.message,
        }).then(data => {
          if (data.riskScore !== undefined) {
            setRiskScore(data.riskScore)
          }
        })
      }
    })
  }, [events, sessionId])

  // Update risk score locally too
  useEffect(() => {
    const highEvents = events.filter(e => e.severity === 'HIGH').length
    const medEvents = events.filter(e => e.severity === 'MEDIUM').length
    const absScore = Math.min(absenceSeconds * 2, 40)
    const flagScore = Math.min(highEvents * 15 + medEvents * 5, 60)
    setRiskScore(Math.min(absScore + flagScore, 100))
  }, [events, absenceSeconds])

  const handleEndSession = async () => {
    setSaving(true)
    if (sessionId) {
      await endSession(sessionId, {
        riskScore,
        flagCount: events.filter(e => e.severity === 'HIGH').length,
        absentTime: absenceSeconds,
      })
    }
    setSaving(false)
    setPhase('ended')
  }

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const riskColor = riskScore >= 70 ? '#ef4444' : riskScore >= 40 ? '#f59e0b' : '#10b981'
  const riskLabel = riskScore >= 70 ? 'HIGH RISK' : riskScore >= 40 ? 'MEDIUM' : 'LOW'

  const statusConfig = {
    initialising: { label: 'Initialising...', color: 'bg-gray-400' },
    present: { label: 'Face Detected', color: 'bg-green-500' },
    absent: { label: 'Face Absent', color: 'bg-red-500' },
    multiple: { label: 'Multiple Faces', color: 'bg-red-500' },
  }

  if (!user) return null

  // Consent screen
  if (phase === 'consent') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Exam Monitoring Consent</h2>
          <p className="text-sm text-gray-500 mb-4">
            This exam requires webcam monitoring to verify your presence.
          </p>
          <ul className="space-y-2 mb-6">
            {[
              'Your webcam will be active during the entire exam',
              'Face detection runs locally — no video is recorded or uploaded',
              'Absence events are logged with timestamps',
              'Multiple faces in frame will be flagged',
              'Your examiner will receive a session report on completion',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/candidate')}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Decline
            </button>
            <button
              onClick={() => setPhase('active')}
              className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
            >
              I Consent — Begin Exam
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Ended screen
  if (phase === 'ended') {
    const flagCount = events.filter(e => e.severity === 'HIGH').length
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Exam Completed</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your session has ended. Results have been sent to your examiner.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-lg font-bold text-gray-900">{fmtTime(elapsed)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Risk Score</p>
              <p className="text-lg font-bold" style={{ color: riskColor }}>{riskScore}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Flags</p>
              <p className="text-lg font-bold text-gray-900">{flagCount}</p>
            </div>
          </div>
          {sessionId && (
            <p className="text-xs text-gray-400 mb-4">Session ID: {sessionId}</p>
          )}
          <button
            onClick={() => router.push('/candidate')}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Active exam
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">atomcamp</span>
          <span className="text-gray-500 text-xs">|</span>
          <span className="text-gray-400 text-xs">Exam Session</span>
          {sessionId && (
            <span className="text-gray-600 text-xs font-mono">#{sessionId.slice(0, 8)}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusConfig[status].color}`} />
            <span className="text-xs text-gray-400">{statusConfig[status].label}</span>
          </div>
          <div className="bg-gray-700 px-3 py-1 rounded-lg">
            <span className="text-white text-sm font-mono">{fmtTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-lg">
            <span className="text-xs text-gray-400">Risk</span>
            <span className="text-sm font-bold" style={{ color: riskColor }}>{riskScore}</span>
            <span className="text-xs" style={{ color: riskColor }}>{riskLabel}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                Question 1 of 10
              </span>
            </div>
            <p className="text-white text-base mb-4">
              This is a sample exam question. In the real product, questions will be loaded from the database based on the assigned exam.
            </p>
            <textarea
              className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={5}
              placeholder="Type your answer here..."
            />
          </div>
          <div className="flex justify-between">
            <button className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600">
              Previous
            </button>
            <button
              onClick={handleEndSession}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Submit Exam'}
            </button>
            <button className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600">
              Next
            </button>
          </div>
        </main>

        <aside className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Camera Feed</p>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full scale-x-[-1]"
              />
              <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-white ${
                status === 'present' ? 'bg-green-600' :
                status === 'absent' ? 'bg-red-600' :
                status === 'multiple' ? 'bg-red-600' : 'bg-gray-600'
              }`}>
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {statusConfig[status].label}
              </div>
            </div>
          </div>

          {absenceSeconds > 0 && (
            <div className="mx-3 mb-3 bg-red-900/30 border border-red-700 rounded-lg p-2">
              <p className="text-xs text-red-400">
                Face absent for <span className="font-bold">{absenceSeconds}s</span>
              </p>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col px-3 pb-3">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
              Events ({events.length})
            </p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {events.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">No events yet</p>
              ) : events.map((event, i) => (
                <div key={i} className={`p-2 rounded-lg text-xs ${
                  event.severity === 'HIGH' ? 'bg-red-900/30 border border-red-800' :
                  event.severity === 'MEDIUM' ? 'bg-yellow-900/30 border border-yellow-800' :
                  'bg-gray-700'
                }`}>
                  <p className="text-white">{event.message}</p>
                  <p className="text-gray-500 mt-0.5">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}