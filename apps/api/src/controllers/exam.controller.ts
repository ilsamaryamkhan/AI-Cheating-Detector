import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const createExamSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
})

// Create exam
export async function createExam(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; organisationId: string }
    const body = createExamSchema.parse(request.body)

    const exam = await prisma.exam.create({
      data: {
        title: body.title,
        description: body.description,
        organisationId: user.organisationId,
      },
    })

    return reply.status(201).send({ exam })
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

// Get all exams for organisation
export async function getExams(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = request.user as { organisationId: string }

    const exams = await prisma.exam.findMany({
      where: { organisationId: user.organisationId },
      include: {
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ exams })
  } catch (err) {
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}

// Get single exam
export async function getExamById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { examId } = request.params as { examId: string }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        sessions: {
          include: {
            candidate: { select: { name: true, email: true } },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    })

    if (!exam) {
      return reply.status(404).send({ error: 'Exam not found' })
    }

    return reply.send({ exam })
  } catch (err) {
    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}