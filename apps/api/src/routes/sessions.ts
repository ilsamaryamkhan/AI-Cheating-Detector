import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.middleware'
import {
  createSession,
  logEvent,
  endSession,
  getSessionReport,
  getProctorSessions,
} from '../controllers/session.controller'

export async function sessionRoutes(fastify: FastifyInstance) {
  // Get all sessions for a proctor — must be before /:sessionId routes
  fastify.get('/sessions/proctor', {
    preHandler: [authenticate],
    handler: getProctorSessions,
  })

  // Create a new exam session
  fastify.post('/sessions', {
    preHandler: [authenticate],
    handler: createSession,
  })

  // Log a detection event
  fastify.post('/sessions/:sessionId/events', {
    preHandler: [authenticate],
    handler: logEvent,
  })

  // End session
  fastify.patch('/sessions/:sessionId/end', {
    preHandler: [authenticate],
    handler: endSession,
  })

  // Get session report
  fastify.get('/sessions/:sessionId/report', {
    preHandler: [authenticate],
    handler: getSessionReport,
  })
}