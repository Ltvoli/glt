import { PrismaClient } from '@prisma/client'
import assert from 'assert'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function cleanTestData() {
  console.log('--- Nettoyage des données de test ---')
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: 'TEST_' } } })
  await prisma.globalLink.deleteMany({
    where: { OR: [{ contactId: { startsWith: 'TEST_' } }, { taskId: { startsWith: 'TEST_' } }] }
  })
  await prisma.contact.deleteMany({ where: { id: { startsWith: 'TEST_' } } })
  await prisma.task.deleteMany({ where: { id: { startsWith: 'TEST_' } } })
  await prisma.mailCase.deleteMany({ where: { id: { startsWith: 'TEST_' } } })
  await prisma.writtenQuestion.deleteMany({ where: { id: { startsWith: 'TEST_' } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: 'TEST_' } } })
}

async function runSecurityTests() {
  console.log('=== SECURITY TESTS ===')

  // 1. Bcrypt validation
  const plainText = 'MotDePasseSécurisé!123'
  const hash = await bcrypt.hash(plainText, 12)
  assert.ok(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$'), 'Hash should use cost 12')
  const isValid = await bcrypt.compare(plainText, hash)
  assert.strictEqual(isValid, true, 'Bcrypt compare should match')

  console.log('✅ Sécurité & Hash OK')
}

async function runIntegrationTests() {
  console.log('=== INTEGRATION TESTS (SCÉNARIO) ===')

  // Create Test User
  const user = await prisma.user.create({
    data: {
      id: 'TEST_USER_1',
      name: 'TEST_Magali',
      email: 'test.magali@example.com',
      passwordHash: 'fakepassword',
      role: 'ADMIN'
    }
  })

  // 1. Créer un contact
  const contact = await prisma.contact.create({
    data: {
      id: 'TEST_CONTACT_1',
      firstName: 'TEST_Jean',
      lastName: 'TEST_Dupont',
      type: 'ELU',
      createdById: user.id
    }
  })
  assert.strictEqual(contact.firstName, 'TEST_Jean', 'Le contact n\'a pas été créé correctement')

  // 2. Créer un courrier pour ce contact
  const mail = await prisma.mailCase.create({
    data: {
      id: 'TEST_MAIL_1',
      reference: 'COU-TEST-0001',
      channel: 'MAIL',
      subject: 'TEST_Demande de subvention',
      assigneeId: user.id
    }
  })

  await prisma.globalLink.create({
    data: { contactId: contact.id, mailCaseId: mail.id }
  })

  // 3. Créer une tâche liée au courrier
  const task = await prisma.task.create({
    data: {
      id: 'TEST_TASK_1',
      title: 'TEST_Répondre à Dupont',
      status: 'A_FAIRE',
      assigneeId: user.id
    }
  })

  await prisma.globalLink.create({
    data: { taskId: task.id, mailCaseId: mail.id }
  })

  // Validation intégration
  const linkedMail = await prisma.mailCase.findUnique({
    where: { id: mail.id },
    include: { links: { include: { contact: true, task: true } } }
  })

  const hasContactLink = linkedMail?.links.some(l => l.contact?.id === contact.id)
  const hasTaskLink = linkedMail?.links.some(l => l.task?.id === task.id)
  
  assert.strictEqual(hasContactLink, true, 'Le courrier devrait être lié au contact')
  assert.strictEqual(hasTaskLink, true, 'Le courrier devrait être lié à la tâche')

  console.log('✅ Intégration (Contact > Courrier > Tâche) OK')
}

async function main() {
  try {
    await cleanTestData()
    await runSecurityTests()
    await runIntegrationTests()
    console.log('✅✅ TOUS LES TESTS SONT PASSÉS ✅✅')
  } catch (error) {
    console.error('❌ ERREUR DE TEST:', error)
    process.exit(1)
  } finally {
    await cleanTestData()
    await prisma.$disconnect()
  }
}

main()
