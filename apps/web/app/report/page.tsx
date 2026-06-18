'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

type Report = {
  sessionId: string
  candidate: { name: string; email: string }
  exam: { title: string }
  startedAt: string
  endedAt: string | null
  duration: number
  riskScore: number
  flagCount: number
  absentTime: number
  highFlags: number
  medFlags: number
  verdict: string
  events: {
    id: string
    type: string
    severity: string
    message: string
    timestamp: string
  }[]
}

function ReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    if (!sessionId) { setError('No session ID provided'); setLoading(false); return }

    fetch(`${API_URL}/api/sessions/${sessionId}/report`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.report) setReport(data.report)
        else setError('Report not found')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load report'); setLoading(false) })
  }, [sessionId])

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const riskColor = (score: number) =>
    score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981'

  const severityBg = (severity: string) =>
    severity === 'HIGH' ? 'bg-red-50 border-red-200 text-red-700' :
    severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
    'bg-gray-50 border-gray-200 text-gray-600'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading report...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  )

  if (!report) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">atomcamp</h1>
            <p className="text-xs text-gray-500">Session Report</p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Candidate info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{report.candidate.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{report.candidate.email}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">{report.exam.title}</p>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
              report.riskScore >= 70 ? 'bg-red-50 text-red-700 border border-red-200' :
              report.riskScore >= 40 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
              'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {report.verdict.split(' — ')[0]}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {new Date(report.startedAt).toLocaleString()} —
            {report.endedAt ? new Date(report.endedAt).toLocaleString() : ' Ongoing'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Risk Score</p>
            <p className="text-3xl font-bold" style={{ color: riskColor(report.riskScore) }}>
              {report.riskScore}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Duration</p>
            <p className="text-3xl font-bold text-gray-900">{fmtTime(report.duration)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">High Flags</p>
            <p className="text-3xl font-bold text-red-500">{report.highFlags}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Absent Time</p>
            <p className="text-3xl font-bold text-gray-900">{report.absentTime}s</p>
          </div>
        </div>

        {/* Verdict */}
        <div className={`rounded-xl border p-4 ${
          report.riskScore >= 70 ? 'bg-red-50 border-red-200' :
          report.riskScore >= 40 ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          <p className="text-sm font-medium" style={{ color: riskColor(report.riskScore) }}>
            Verdict: {report.verdict}
          </p>
        </div>

        {/* Event timeline */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Event Timeline ({report.events.length} events)
            </h3>
          </div>
          {report.events.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-400">No events recorded for this session.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {report.events.map(event => (
                <div key={event.id} className="px-6 py-3 flex items-start gap-4">
                  <div className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium border ${severityBg(event.severity)}`}>
                    {event.severity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{event.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">{event.type}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session ID */}
        <p className="text-xs text-gray-400 text-center">Session ID: {report.sessionId}</p>
      </main>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading...</p></div>}>
      <ReportContent />
    </Suspense>
  )
}