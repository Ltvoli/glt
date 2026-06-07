import { PrismaClient, Role, SettingType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Settings
  const settings = [
    { key: 'app.name', value: 'CDC SaaS', type: SettingType.STRING, category: 'general', label: 'Nom de l\'application' },
    { key: 'app.locale', value: 'fr', type: SettingType.STRING, category: 'general', label: 'Langue par défaut' },
    { key: 'auth.session_ttl', value: '86400', type: SettingType.NUMBER, category: 'auth', label: 'Durée de session (secondes)' },
    { key: 'auth.max_attempts', value: '5', type: SettingType.NUMBER, category: 'auth', label: 'Tentatives max avant blocage' },
    { key: 'auth.lockout_duration', value: '900', type: SettingType.NUMBER, category: 'auth', label: 'Durée du blocage (secondes)' },
    { key: 'email.from', value: 'no-reply@cdc.app', type: SettingType.STRING, category: 'email', label: 'Email d\'expédition' },
    { key: 'email.smtp_host', value: 'localhost', type: SettingType.STRING, category: 'email', label: 'Hôte SMTP' },
    { key: 'email.smtp_port', value: '587', type: SettingType.NUMBER, category: 'email', label: 'Port SMTP' },
    { key: 'rgpd.retention_days', value: '365', type: SettingType.NUMBER, category: 'rgpd', label: 'Durée de rétention des données' },
    { key: 'rgpd.audit_purge_days', value: '90', type: SettingType.NUMBER, category: 'rgpd', label: 'Durée de rétention des logs d\'audit' },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s
    })
  }
  console.log('Settings seeded.')

  // 2. Modules
  const modulesKeys = ['contacts', 'tasks', 'mailcases', 'questions', 'agenda', 'reports']
  for (let i = 0; i < modulesKeys.length; i++) {
    await prisma.module.upsert({
      where: { key: modulesKeys[i] },
      update: {},
      create: { key: modulesKeys[i], label: modulesKeys[i].charAt(0).toUpperCase() + modulesKeys[i].slice(1), order: i, isActive: true }
    })
  }
  console.log('Modules seeded.')

  // 3. Permissions
  const baseActions = ['read', 'create', 'update', 'delete']
  for (const m of modulesKeys) {
    for (const a of baseActions) {
      const key = `${m}.${a}`
      await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: `${a} on ${m}`, module: m }
      })
    }
  }

  const adminPerms = ['users.manage', 'roles.manage', 'modules.manage', 'pages.manage', 'settings.manage', 'audit.read']
  for (const p of adminPerms) {
    await prisma.permission.upsert({
      where: { key: p },
      update: {},
      create: { key: p, label: p, module: 'admin' }
    })
  }
  console.log('Permissions seeded.')

  // 4. Role Permissions
  const allPerms = await prisma.permission.findMany()
  // SUPERADMIN gets everything
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: Role.SUPERADMIN, permissionId: p.id } },
      update: {},
      create: { role: Role.SUPERADMIN, permissionId: p.id }
    })
  }

  // READONLY gets only .read
  const readPerms = allPerms.filter(p => p.key.endsWith('.read'))
  for (const p of readPerms) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: Role.READONLY, permissionId: p.id } },
      update: {},
      create: { role: Role.READONLY, permissionId: p.id }
    })
  }

  // USER gets standard module perms
  const userPerms = allPerms.filter(p => p.module !== 'admin')
  for (const p of userPerms) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: Role.USER, permissionId: p.id } },
      update: {},
      create: { role: Role.USER, permissionId: p.id }
    })
  }

  // ADMIN gets standard + admin perms except maybe roles? For now all.
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: Role.ADMIN, permissionId: p.id } },
      update: {},
      create: { role: Role.ADMIN, permissionId: p.id }
    })
  }
  console.log('Role Permissions seeded.')

  // 5. Users
  const users = [
    { name: 'SUPERADMIN', email: 'admin@cdc.app', role: Role.SUPERADMIN, rawPass: 'Admin@123456!' },
    { name: 'ADMIN', email: 'manager@cdc.app', role: Role.ADMIN, rawPass: 'Manager@123456!' },
    { name: 'USER', email: 'user@cdc.app', role: Role.USER, rawPass: 'User@123456!' },
    { name: 'READONLY', email: 'readonly@cdc.app', role: Role.READONLY, rawPass: 'Readonly@123456!' },
  ]

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.rawPass, 10)
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash,
          isActive: true
        },
      })
      console.log(`Created user ${u.name}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
