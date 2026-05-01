import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { hashPassword, comparePassword } from '../utils/password'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'PROCTOR', 'CANDIDATE']).default('CANDIDATE'),
  organisationName: z.string().min(2, 'Organisation name is required'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Register
export async function register(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = registerSchema.parse(request.body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (existingUser) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'A user with this email already exists',
      })
    }

    // Create organisation or find existing one
    let organisation = await prisma.organisation.findFirst({
      where: { name: body.organisationName },
    })

    if (!organisation) {
      organisation = await prisma.organisation.create({
        data: { name: body.organisationName },
      })
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(body.password)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role,
        organisationId: organisation.id,
      },
    })

    // Generate JWT token
    const token = await reply.jwtSign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organisationId: user.organisationId,
      },
      { expiresIn: '7d' }
    )

    return reply.status(201).send({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organisationId: user.organisationId,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: (err as any).errors[0].message,
      })
    }
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong',
    })
  }
}

// Login
export async function login(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = loginSchema.parse(request.body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { organisation: true },
    })

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      })
    }

    // Check password
    const validPassword = await comparePassword(body.password, user.password)

    if (!validPassword) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      })
    }

    // Generate JWT token
    const token = await reply.jwtSign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organisationId: user.organisationId,
      },
      { expiresIn: '7d' }
    )

    return reply.send({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organisation: user.organisation.name,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: (err as any).errors[0].message,
      })
    }
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong',
    })
  }
}

// Get current user
export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const payload = request.user as { id: string }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { organisation: true },
    })

    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      })
    }

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organisation: user.organisation.name,
      },
    })
  } catch (err) {
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong',
    })
  }
}