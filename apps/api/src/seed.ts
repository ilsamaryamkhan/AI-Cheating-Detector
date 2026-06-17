import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create organisation
  const org = await prisma.organisation.upsert({
    where: { id: 'seed-org-001' },
    update: {},
    create: {
      id: 'seed-org-001',
      name: 'atomcamp Arabia',
    },
  })

  console.log('Organisation created:', org.name)

  // Create admin
  const adminPassword = await bcrypt.hash('password123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@atomcamp.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@atomcamp.com',
      password: adminPassword,
      role: 'ADMIN',
      organisationId: org.id,
    },
  })

  console.log('Admin created:', admin.email)

  // Create proctor
  const proctorPassword = await bcrypt.hash('password123', 12)
  const proctor = await prisma.user.upsert({
    where: { email: 'proctor@atomcamp.com' },
    update: {},
    create: {
      name: 'Test Proctor',
      email: 'proctor@atomcamp.com',
      password: proctorPassword,
      role: 'PROCTOR',
      organisationId: org.id,
    },
  })

  console.log('Proctor created:', proctor.email)

  // Create demo exam
  const exam = await prisma.exam.upsert({
    where: { id: 'demo-exam-001' },
    update: {},
    create: {
      id: 'demo-exam-001',
      title: 'Demo Exam',
      description: 'Sample exam for testing',
      organisationId: org.id,
    },
  })

  console.log('Exam created:', exam.title)
  console.log('Seeding complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())