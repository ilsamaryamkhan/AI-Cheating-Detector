import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.middleware'
import {
  createExam,
  getExams,
  getExamById,
} from '../controllers/exam.controller'

export async function examRoutes(fastify: FastifyInstance) {
  // Create exam
  fastify.post('/exams', {
    preHandler: [authenticate],
    handler: createExam,
  })

  // Get all exams for organisation
  fastify.get('/exams', {
    preHandler: [authenticate],
    handler: getExams,
  })

  // Get single exam
  fastify.get('/exams/:examId', {
    preHandler: [authenticate],
    handler: getExamById,
  })
}