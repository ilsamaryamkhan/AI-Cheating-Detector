import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { authRoutes } from './routes/auth'
import { sessionRoutes } from './routes/sessions'
import { examRoutes } from './routes/exams'

dotenv.config()

const server = Fastify({ logger: false })

// Register plugins
server.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

server.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret-change-in-production',
})

server.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'cookie-secret-change-in-production',
})

// Register routes
server.register(authRoutes, { prefix: '/api' })
server.register(sessionRoutes, { prefix: '/api' })
server.register(examRoutes, { prefix: '/api' })

// Health check
server.get('/health', async () => {
  return {
    status: 'ok',
    message: 'atomcamp Cheating Detection API is running',
    timestamp: new Date().toISOString(),
  }
})

const start = async () => {
  try {
    await server.ready()

    // Attach Socket.io to Fastify's underlying Node HTTP server
    const io = new Server(server.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PATCH'],
        credentials: true,
      },
    })

    ;(global as any).io = io

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('proctor:join', (organisationId: string) => {
        socket.join(`org:${organisationId}`)
        console.log(`Proctor joined org: ${organisationId}`)
      })

      socket.on('candidate:join', (sessionId: string) => {
        socket.join(`session:${sessionId}`)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    await server.listen({
      port: Number(process.env.PORT) || 4000,
      host: '0.0.0.0',
    })

    console.log('Server running on http://localhost:4000')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start()