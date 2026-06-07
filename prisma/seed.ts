import { PrismaClient, Role, SettingType, OrgType, PermanenceStatus } from '@prisma/client'
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
  const modulesKeys = ['contacts', 'tasks', 'mailcases', 'questions', 'agenda', 'reports', 'permanences']
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

  // Extra Special Permissions for Permanences
  const extraPerms = [
    { key: 'permanences.validate', label: 'Valider / renvoyer une permanence', module: 'permanences' },
    { key: 'permanences.export', label: 'Exporter une permanence', module: 'permanences' }
  ]
  for (const p of extraPerms) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p
    })
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
  
  for (const p of allPerms) {
    // SUPERADMIN gets everything
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: Role.SUPERADMIN, permissionId: p.id } },
      update: {},
      create: { role: Role.SUPERADMIN, permissionId: p.id }
    })

    // ADMIN gets everything EXCEPT 'permanences.validate'
    if (p.key !== 'permanences.validate') {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: Role.ADMIN, permissionId: p.id } },
        update: {},
        create: { role: Role.ADMIN, permissionId: p.id }
      })
    }

    // READONLY gets only read permissions
    if (p.key.endsWith('.read')) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: Role.READONLY, permissionId: p.id } },
        update: {},
        create: { role: Role.READONLY, permissionId: p.id }
      })
    }

    // USER gets standard permissions (non-admin) EXCEPT delete/validate
    // But USER gets permanences.export
    const isUserAllowed = (p.module !== 'admin' && !p.key.endsWith('.delete') && p.key !== 'permanences.validate') || p.key === 'permanences.export'
    if (isUserAllowed) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: Role.USER, permissionId: p.id } },
        update: {},
        create: { role: Role.USER, permissionId: p.id }
      })
    }
  }
  console.log('Role Permissions seeded.')

  // 5. Pages
  const pages = [
    { slug: '/contacts', label: 'Contacts', moduleId: 'contacts', permission: 'contacts.read', order: 0 },
    { slug: '/tasks', label: 'Tâches', moduleId: 'tasks', permission: 'tasks.read', order: 1 },
    { slug: '/mails', label: 'Courriers', moduleId: 'mailcases', permission: 'mailcases.read', order: 2 },
    { slug: '/qe', label: 'Questions (QE)', moduleId: 'questions', permission: 'questions.read', order: 3 },
    { slug: '/planning', label: 'Planning', moduleId: 'agenda', permission: 'agenda.read', order: 4 },
    { slug: '/reports/weekly', label: 'Rapports', moduleId: 'reports', permission: 'reports.read', order: 5 },
    { slug: '/permanences', label: 'Permanences', moduleId: 'permanences', permission: 'permanences.read', order: 6 },
  ]
  
  for (const page of pages) {
    const mod = await prisma.module.findUnique({ where: { key: page.moduleId } })
    if (mod) {
      await prisma.page.upsert({
        where: { slug: page.slug },
        update: { label: page.label, order: page.order, permission: page.permission, moduleId: mod.id },
        create: { slug: page.slug, label: page.label, order: page.order, permission: page.permission, moduleId: mod.id }
      })
    }
  }
  console.log('Pages seeded.')

  // 6. Users
  const usersData = [
    { name: 'SUPERADMIN', email: 'admin@cdc.app', role: Role.SUPERADMIN, rawPass: 'Admin@123456!' },
    { name: 'ADMIN', email: 'manager@cdc.app', role: Role.ADMIN, rawPass: 'Manager@123456!' },
    { name: 'USER', email: 'user@cdc.app', role: Role.USER, rawPass: 'User@123456!' },
    { name: 'READONLY', email: 'readonly@cdc.app', role: Role.READONLY, rawPass: 'Readonly@123456!' },
  ]

  const seededUsers: Record<string, string> = {}

  for (const u of usersData) {
    let existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.rawPass, 10)
      existing = await prisma.user.create({
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
    seededUsers[u.role] = existing.id
  }

  // 7. Communes (Top 5 Demonstration)
  const communesData = [
    { name: 'Nice', zipCode: '06000', inseeCode: '06088', department: 'Alpes-Maritimes' },
    { name: 'Antibes', zipCode: '06600', inseeCode: '06004', department: 'Alpes-Maritimes' },
    { name: 'Cagnes-sur-Mer', zipCode: '06800', inseeCode: '06027', department: 'Alpes-Maritimes' },
    { name: 'Vence', zipCode: '06140', inseeCode: '06157', department: 'Alpes-Maritimes' },
    { name: 'Saint-Laurent-du-Var', zipCode: '06700', inseeCode: '06123', department: 'Alpes-Maritimes' },
  ]

  const seededCommunes: Record<string, string> = {}

  for (const c of communesData) {
    const existing = await prisma.commune.upsert({
      where: { inseeCode: c.inseeCode },
      update: {},
      create: c
    })
    seededCommunes[c.name] = existing.id
  }
  console.log('Communes seeded.')

  // 8. Organizations (3 commerces de démo rattachés à Nice)
  const orgsData = [
    { name: 'Boulangerie du Port', type: OrgType.COMMERCE, sector: 'Alimentation', city: 'Nice', zipCode: '06000', notes: 'Très favorable, engagée localement.' },
    { name: 'Café de la Place', type: OrgType.COMMERCE, sector: 'Restauration', city: 'Nice', zipCode: '06000', notes: 'Neutre, préoccupations sur la sécurité.' },
    { name: 'Pharmacie Centrale', type: OrgType.COMMERCE, sector: 'Santé', city: 'Nice', zipCode: '06000', notes: 'Défavorable ou sceptique.' },
  ]

  const seededOrgs: Record<string, string> = {}

  for (const o of orgsData) {
    const existing = await prisma.organization.create({
      data: o
    })
    seededOrgs[o.name] = existing.id
  }
  console.log('Organizations seeded.')

  // 9. Permanences Mobiles
  const adminUserId = seededUsers[Role.SUPERADMIN]

  // A. VALIDATED Permanence
  const permValidated = await prisma.mobilePermanence.create({
    data: {
      title: 'Permanence Mobile - Nice Centre',
      status: PermanenceStatus.VALIDATED,
      scheduledStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // J+7
      ownerUserId: adminUserId,
      score: 100,
      notes: 'Permanence validée pour Nice Centre.'
    }
  })

  // Generate completed tasks for VALIDATED
  await createCompletedTasks(permValidated.id, adminUserId)

  // B. IN_PROGRESS Permanence (Score ~61%, with 2 uncompleted required tasks)
  const permInProgress = await prisma.mobilePermanence.create({
    data: {
      title: 'Permanence Mobile - Antibes Port',
      status: PermanenceStatus.IN_PROGRESS,
      scheduledStartDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // J+3
      ownerUserId: adminUserId,
      score: 61,
      notes: 'Préparation en cours. Manque logistique et communication.'
    }
  })

  // Generate mixed tasks for IN_PROGRESS
  await createMixedTasks(permInProgress.id, adminUserId)

  // C. DRAFT Permanence (Empty, all TODO)
  const permDraft = await prisma.mobilePermanence.create({
    data: {
      title: 'Permanence Mobile - Cagnes-sur-Mer',
      status: PermanenceStatus.DRAFT,
      scheduledStartDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // J+15
      ownerUserId: adminUserId,
      score: 0,
      notes: 'Brouillon initial.'
    }
  })

  // Generate all TODO tasks for DRAFT
  await createTodoTasks(permDraft.id)

  // 10. Links/Locations for permanences
  await prisma.permanenceLocation.create({
    data: {
      permanenceId: permValidated.id,
      communeId: seededCommunes['Nice'],
      communeName: 'Nice',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startTime: '09:00',
      endTime: '12:00',
      address: 'Place Garibaldi',
      parkingStatus: 'DONE'
    }
  })

  await prisma.permanenceLocation.create({
    data: {
      permanenceId: permInProgress.id,
      communeId: seededCommunes['Antibes'],
      communeName: 'Antibes',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      startTime: '14:00',
      endTime: '17:00',
      address: 'Port Vauban',
      parkingStatus: 'TODO'
    }
  })

  await prisma.permanenceLocation.create({
    data: {
      permanenceId: permDraft.id,
      communeId: seededCommunes['Cagnes-sur-Mer'],
      communeName: 'Cagnes-sur-Mer',
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      startTime: '10:00',
      endTime: '13:00',
      address: 'Promenade de la Plage',
      parkingStatus: 'TODO'
    }
  })

  // 11. Synthesis for VALIDATED
  await prisma.permanenceSynthesis.create({
    data: {
      permanenceId: permValidated.id,
      attentionPoints: 'Forte demande sur le pouvoir d\'achat et la sécurité au Port.',
      merchantProgram: 'Visite de 4 commerces dans l\'avenue de la République.',
      phoningTopics: 'Sujet récurrent sur les retraites.',
      recommendations: 'Prévoir un point presse local lors de la prochaine édition.',
      signedByUserId: adminUserId,
      signedAt: new Date()
    }
  })

  console.log('Permanences Mobiles seeded successfully.')
}

async function createTodoTasks(permanenceId: string) {
  const tasks = getDefaultTasksTemplate()
  for (const t of tasks) {
    await prisma.permanenceTask.create({
      data: {
        permanenceId,
        section: t.section,
        label: t.label,
        required: t.required,
        order: t.order,
        status: 'TODO'
      }
    })
  }
}

async function createCompletedTasks(permanenceId: string, userId: string) {
  const tasks = getDefaultTasksTemplate()
  for (const t of tasks) {
    await prisma.permanenceTask.create({
      data: {
        permanenceId,
        section: t.section,
        label: t.label,
        required: t.required,
        order: t.order,
        status: 'DONE',
        assigneeUserId: userId,
        dueDate: new Date(),
        comment: 'Fait par le seed.'
      }
    })
  }
}

async function createMixedTasks(permanenceId: string, userId: string) {
  const tasks = getDefaultTasksTemplate()
  // Total 13 tasks: let's make 8 DONE and 5 TODO (including 2 required)
  // Let's set statuses
  let doneCount = 0
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    // Make first 8 DONE, rest TODO
    // Task 0: communication (required) -> DONE
    // Task 1: communication (required) -> TODO (required blockage 1)
    // Task 2: phoning (required) -> DONE
    // Task 3: phoning (required) -> DONE
    // Task 4: courrier (required) -> DONE
    // Task 5: courrier (required) -> DONE
    // Task 6: commercants (required) -> DONE
    // Task 7: commercants (required) -> DONE
    // Task 8: institutionnel (required) -> DONE
    // Task 9: institutionnel (required) -> TODO (required blockage 2)
    // Task 10: logistique (required) -> TODO
    // Task 11: logistique (required) -> TODO
    // Task 12: logistique (required) -> TODO
    const isDone = i === 0 || i === 2 || i === 3 || i === 4 || i === 5 || i === 6 || i === 7 || i === 8
    await prisma.permanenceTask.create({
      data: {
        permanenceId,
        section: t.section,
        label: t.label,
        required: t.required,
        order: t.order,
        status: isDone ? 'DONE' : 'TODO',
        assigneeUserId: isDone ? userId : null,
        dueDate: isDone ? new Date() : null,
        comment: isDone ? 'Fait.' : null
      }
    })
  }
}

function getDefaultTasksTemplate() {
  return [
    { section: 'communication', label: 'Envoyer email aux élus', required: true, order: 0 },
    { section: 'communication', label: 'Post réseaux sociaux', required: true, order: 1 },
    { section: 'phoning', label: 'Valider liste contacts', required: true, order: 0 },
    { section: 'phoning', label: 'Lancer les appels', required: true, order: 1 },
    { section: 'courrier', label: 'Identifier contacts sans email', required: true, order: 0 },
    { section: 'courrier', label: 'Envoyer courrier postal', required: true, order: 1 },
    { section: 'commercants', label: 'Identifier commerces à visiter', required: true, order: 0 },
    { section: 'commercants', label: 'Valider programme visite', required: true, order: 1 },
    { section: 'institutionnel', label: 'Contacter mairies concernées', required: true, order: 0 },
    { section: 'institutionnel', label: 'Envoyer convocations presse', required: true, order: 1 },
    { section: 'logistique', label: 'Réserver parking', required: true, order: 0 },
    { section: 'logistique', label: 'Préparer le matériel', required: true, order: 1 },
    { section: 'logistique', label: 'Confirmation accès lieux', required: true, order: 2 },
  ]
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
