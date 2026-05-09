import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const createSessionSchema = z.object({
  examId: z.string(),
})

const logEventSchema = z.object({
  type: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  message: z.string(),
})

const endSessionSchema = z.object({
  riskScore: z.number(),
  flagCount: z.number(),
  absentTime: z.number(),
})

// Create session
export async function createSession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; role: string }
    const body = createSessionSchema.parse(request.body)

    const session = await prisma.session.create({
      data: {
        candidateId: user.id,
        examId: body.examId,
        status: 'active',
      },
      include: {
        candidate: { select: { name: true, email: true } },
        exam: { select: { title: true } },
      },
    })

    return reply.status(201).send({ session })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: (err as any).errors[0].message,
      })
    }
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}

// Log detection event
export async function logEvent(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { sessionId } = request.params as { sessionId: string }
    const body = logEventSchema.parse(request.body)

    const event = await prisma.event.create({
      data: {
        sessionId,
        type: body.type,
        severity: body.severity,
        message: body.message,
      },
    })

    // Update session risk score in real time
    const highEvents = await prisma.event.count({
      where: { sessionId, severity: 'HIGH' },
    })
    const medEvents = await prisma.event.count({
      where: { sessionId, severity: 'MEDIUM' },
    })

    const riskScore = Math.min(highEvents * 15 + medEvents * 5, 100)

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        riskScore,
        flagCount: highEvents,
      },
    })

    return reply.send({ event, riskScore })
  } catch (err) {
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}

// End session and generate report
export async function endSession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { sessionId } = request.params as { sessionId: string }
    const body = endSessionSchema.parse(request.body)

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        riskScore: body.riskScore,
        flagCount: body.flagCount,
        absentTime: body.absentTime,
      },
      include: {
        candidate: {
          select: { name: true, email: true },
          },
        exam: {
          select: { title: true },
        },
        events: {
          orderBy: { timestamp: 'desc' },
        },
      },
    })

    return reply.send({
      message: 'Session ended successfully',
      session,
    })
  } catch (err) {
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}

// Get session report
export async function getSessionReport(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { sessionId } = request.params as { sessionId: string }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        candidate: {
          select: { name: true, email: true },
        },
        exam: {
          select: { title: true },
        },
        events: {
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    // Build report summary
    const highFlags = session.events.filter(e => e.severity === 'HIGH').length
    const medFlags = session.events.filter(e => e.severity === 'MEDIUM').length
    const duration = session.endedAt
      ? Math.floor(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
        )
      : 0

    const report = {
      sessionId: session.id,
      candidate: session.candidate,
      exam: session.exam,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration,
      riskScore: session.riskScore,
      flagCount: session.flagCount,
      absentTime: session.absentTime,
      highFlags,
      medFlags,
      verdict:
        session.riskScore >= 70
          ? 'HIGH RISK — Manual review required'
          : session.riskScore >= 40
          ? 'MEDIUM RISK — Review recommended'
          : 'LOW RISK — No action required',
      events: session.events,
    }

    return reply.send({ report })
  } catch (err) {
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}

// Get all sessions for proctor
export async function getProctorSessions(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = request.user as { organisationId: string }

    const sessions = await prisma.session.findMany({
      where: {
        exam: {
          organisationId: user.organisationId,
        },
      },
      include: {
        candidate: {
          select: { name: true, email: true },
        },
        exam: {
          select: { title: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    return reply.send({ sessions })
  } catch (err) {
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}