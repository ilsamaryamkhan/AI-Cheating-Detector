import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    })
  }
}

export function authorise(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const user = request.user as { role: string }
      if (!roles.includes(user.role)) {
        reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        })
      }
    } catch (err) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource',
      })
    }
  }
}