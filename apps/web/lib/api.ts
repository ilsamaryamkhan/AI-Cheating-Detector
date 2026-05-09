const API_URL = 'http://localhost:4000/api'

function getToken() {
  return localStorage.getItem('token')
}

export async function createSession(examId: string) {
  const res = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ examId }),
  })
  return res.json()
}

export async function logEvent(
  sessionId: string,
  event: { type: string; severity: string; message: string }
) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(event),
  })
  return res.json()
}

export async function endSession(
  sessionId: string,
  data: { riskScore: number; flagCount: number; absentTime: number }
) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/end`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getSessionReport(sessionId: string) {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/report`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return res.json()
}