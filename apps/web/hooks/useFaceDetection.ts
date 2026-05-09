import { useEffect, useRef, useState, useCallback } from 'react'

export type FaceEvent = {
  type: 'FACE_ABSENT' | 'FACE_PRESENT' | 'MULTIPLE_FACES' | 'GAZE_AWAY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  message: string
  timestamp: string
}

export type FaceStatus = 'initialising' | 'present' | 'absent' | 'multiple'

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  active: boolean
) {
  const [status, setStatus] = useState<FaceStatus>('initialising')
  const [events, setEvents] = useState<FaceEvent[]>([])
  const [absenceSeconds, setAbsenceSeconds] = useState(0)

  const detectorRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const absenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const absenceCountRef = useRef(0)
  const lastStatusRef = useRef<FaceStatus>('initialising')

  const addEvent = useCallback((event: FaceEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 100))
  }, [])

  const handleResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const detections = results.detections || []
    const faceCount = detections.length

    // Draw bounding boxes
    detections.forEach((detection: any) => {
      const bb = detection.boundingBox
      const x = bb.xCenter * canvas.width - (bb.width * canvas.width) / 2
      const y = bb.yCenter * canvas.height - (bb.height * canvas.height) / 2
      const w = bb.width * canvas.width
      const h = bb.height * canvas.height

      ctx.strokeStyle = faceCount === 1 ? '#10b981' : '#ef4444'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)

      // Corner brackets
      const cs = 14
      ctx.lineWidth = 3
      ctx.beginPath()
      // Top left
      ctx.moveTo(x, y + cs); ctx.lineTo(x, y); ctx.lineTo(x + cs, y)
      // Top right
      ctx.moveTo(x + w - cs, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cs)
      // Bottom left
      ctx.moveTo(x, y + h - cs); ctx.lineTo(x, y + h); ctx.lineTo(x + cs, y + h)
      // Bottom right
      ctx.moveTo(x + w - cs, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cs)
      ctx.stroke()
    })

    // Update status
    if (faceCount === 0) {
      if (lastStatusRef.current !== 'absent') {
        lastStatusRef.current = 'absent'
        setStatus('absent')
        absenceCountRef.current = 0

        absenceTimerRef.current = setInterval(() => {
          absenceCountRef.current += 1
          setAbsenceSeconds(absenceCountRef.current)

          if (absenceCountRef.current === 5) {
            addEvent({
              type: 'FACE_ABSENT',
              severity: 'HIGH',
              message: 'Candidate face not detected for 5 seconds',
              timestamp: new Date().toISOString(),
            })
          }
        }, 1000)
      }
    } else if (faceCount > 1) {
      if (lastStatusRef.current !== 'multiple') {
        lastStatusRef.current = 'multiple'
        setStatus('multiple')
        if (absenceTimerRef.current) clearInterval(absenceTimerRef.current)
        addEvent({
          type: 'MULTIPLE_FACES',
          severity: 'HIGH',
          message: `${faceCount} faces detected in frame`,
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      if (lastStatusRef.current !== 'present') {
        if (lastStatusRef.current === 'absent') {
          addEvent({
            type: 'FACE_PRESENT',
            severity: 'LOW',
            message: `Face returned after ${absenceCountRef.current}s absence`,
            timestamp: new Date().toISOString(),
          })
        }
        lastStatusRef.current = 'present'
        setStatus('present')
        setAbsenceSeconds(0)
        absenceCountRef.current = 0
        if (absenceTimerRef.current) clearInterval(absenceTimerRef.current)
      }
    }
  }, [canvasRef, videoRef, addEvent])

  useEffect(() => {
    if (!active || !videoRef.current) return

    let mounted = true

    const init = async () => {
      try {
        const { FaceDetection } = await import('@mediapipe/face_detection')
        const { Camera } = await import('@mediapipe/camera_utils')

        const fd = new FaceDetection({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}`,
        })

        fd.setOptions({
          model: 'short',
          minDetectionConfidence: 0.5,
        })

        fd.onResults(handleResults)
        await fd.initialize()

        if (!mounted) return
        detectorRef.current = fd

        const camera = new Camera(videoRef.current!, {
          onFrame: async () => {
            if (detectorRef.current && videoRef.current) {
              await detectorRef.current.send({ image: videoRef.current })
            }
          },
          width: 640,
          height: 480,
        })

        await camera.start()
        if (!mounted) return
        cameraRef.current = camera
        setStatus('present')
      } catch (err) {
        console.error('Face detection init error:', err)
      }
    }

    init()

    return () => {
      mounted = false
      if (cameraRef.current) cameraRef.current.stop()
      if (detectorRef.current) detectorRef.current.close()
      if (absenceTimerRef.current) clearInterval(absenceTimerRef.current)
    }
  }, [active, videoRef, handleResults])

  return { status, events, absenceSeconds }
}