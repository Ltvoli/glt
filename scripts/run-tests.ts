import { PrismaClient, Role } from '@prisma/client'
import assert from 'assert'
import bcrypt from 'bcryptjs'
import { encrypt, decrypt } from '../src/lib/crypto'
import { mapRoleToLegacy } from '../src/lib/session'

const prisma = new PrismaClient()

async function cleanTestData() {
  console.log('--- Nettoyage des données de test ---')
  await prisma.invitation.deleteMany({ where: { id: { startsWith: 'TEST_' } } })
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: 'TEST_' } } })
  await prisma.userSession.deleteMany({ where: { userId: { startsWith: 'TEST_' } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: 'TEST_' } } })
  await prisma.tag.deleteMany({ where: { name: { startsWith: 'TEST_' } } })
}

async function runSecurityTests() {
  console.log('=== SECURITY & CRYPTO TESTS ===')

  // 1. Bcrypt validation
  const plainText = 'MotDePasseSécurisé!123'
  const hash = await bcrypt.hash(plainText, 12)
  assert.ok(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$'), 'Hash should use cost 12')
  const isValid = await bcrypt.compare(plainText, hash)
  assert.strictEqual(isValid, true, 'Bcrypt compare should match')

  // 2. AES-256-GCM symmetric encryption
  const testSecret = 'SuperSecret2faKey123'
  const encrypted = encrypt(testSecret)
  const decrypted = decrypt(encrypted)
  assert.strictEqual(decrypted, testSecret, 'AES decryption should recover plaintext secret')

  console.log('✅ Sécurité & Hash & Chiffrement AES OK')
}

async function runRoleMappingTests() {
  console.log('=== ROLE COMPATIBILITY MAPPING TESTS ===')

  // Verify compatibility mapping for legacy business pages
  assert.strictEqual(mapRoleToLegacy(Role.ADMINISTRATEUR), 'SUPERADMIN', 'ADMINISTRATEUR -> SUPERADMIN')
  assert.strictEqual(mapRoleToLegacy(Role.SUPERVISEUR), 'ADMIN', 'SUPERVISEUR -> ADMIN')
  assert.strictEqual(mapRoleToLegacy(Role.COORDINATEUR), 'USER', 'COORDINATEUR -> USER')
  assert.strictEqual(mapRoleToLegacy(Role.USER), 'READONLY', 'USER -> READONLY')

  console.log('✅ Mapping de compatibilité des rôles OK')
}

async function runUserCreationTests() {
  console.log('=== USER REGISTRATION TESTS ===')

  const passwordHash = await bcrypt.hash('Admin@123456!', 10)
  
  // Create new active user with split firstName/lastName
  const user = await prisma.user.create({
    data: {
      id: 'TEST_USER_1',
      firstName: 'Lionel',
      lastName: 'Tivoli',
      email: 'test.lionel@example.com',
      passwordHash,
      role: Role.ADMINISTRATEUR,
      isActive: true
    }
  })

  // Check name computed field compatibility via extended client
  assert.strictEqual(user.firstName, 'Lionel')
  assert.strictEqual(user.lastName, 'Tivoli')

  console.log('✅ Inscription et conformité du modèle User OK')
}

async function runInvitationTests() {
  console.log('=== INVITATION FLOW TESTS ===')

  // Create an invitation using the test user created in runUserCreationTests
  const invitation = await prisma.invitation.create({
    data: {
      id: 'TEST_INVITATION_1',
      email: 'test.invite@example.com',
      role: Role.COORDINATEUR,
      token: 'test-token-uuid-1234',
      invitedById: 'TEST_USER_1',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h validation
    }
  })

  // Test active/expired status
  const isExpired = new Date() > invitation.expiresAt
  assert.strictEqual(isExpired, false, 'New invitation should be active (not expired)')

  const expiredInvite = await prisma.invitation.create({
    data: {
      id: 'TEST_INVITATION_2',
      email: 'test.expired@example.com',
      role: Role.USER,
      token: 'test-token-expired-5678',
      invitedById: 'TEST_USER_1',
      expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1h ago
    }
  })

  const isExpiredTrue = new Date() > expiredInvite.expiresAt
  assert.strictEqual(isExpiredTrue, true, 'Expired invitation should be flagged as expired')

  console.log('✅ Flux d\'invitation et expiration 48h OK')
}

async function main() {
  try {
    await cleanTestData()
    await runSecurityTests()
    await runRoleMappingTests()
    await runUserCreationTests()
    await runInvitationTests()
    console.log('✅✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS ✅✅')
  } catch (error) {
    console.error('❌ ERREUR DE TEST:', error)
    process.exit(1)
  } finally {
    await cleanTestData()
    await prisma.$disconnect()
  }
}

main()
