import { FastifyInstance } from 'fastify'
import { register, login, getMe } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/auth/register', register)

  // Login
  fastify.post('/auth/login', login)

  // Get current user — protected route
  fastify.get('/auth/me', {
    preHandler: [authenticate],
    handler: getMe,
  })
}