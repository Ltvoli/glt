import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runTests() {
  console.log('--- DEBUT DES TESTS ---')
  try {
    // 1. Récupération d'un utilisateur existant (ou création)
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Testeur',
          email: 'test@example.com',
          passwordHash: 'dummy'
        }
      })
    }
    console.log('✅ Utilisateur récupéré:', user.name)

    // 2. Création d'une tâche
    const task = await prisma.task.create({
      data: {
        title: 'Tâche de test automatique',
        description: 'Vérification du système de statut',
        priority: 'HAUTE',
        status: 'A_FAIRE',
        assigneeId: user.id,
        dueDate: new Date()
      }
    })
    console.log('✅ Tâche créée avec ID:', task.id)

    // 3. Changement de statut vers TERMINEE
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: { 
        status: 'TERMINEE',
        completedAt: new Date()
      }
    })

    if (updatedTask.status === 'TERMINEE' && updatedTask.completedAt !== null) {
      console.log('✅ Changement de statut fonctionnel (completedAt rempli)')
    } else {
      console.error('❌ Échec du changement de statut')
    }

    // 4. Test des Notifications
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TEST',
        title: 'Notification Test',
        message: 'Ceci est un test',
        severity: 'INFO'
      }
    })
    console.log('✅ Notification créée:', notification.title)

    // 5. Nettoyage
    await prisma.task.delete({ where: { id: task.id } })
    await prisma.notification.delete({ where: { id: notification.id } })
    console.log('✅ Nettoyage terminé')

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error)
  } finally {
    await prisma.$disconnect()
  }
  console.log('--- FIN DES TESTS ---')
}

runTests()
