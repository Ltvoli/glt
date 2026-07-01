import { NextResponse } from 'next/server'
import { generateRecurringTasks } from '@/lib/generate-recurring-tasks'

// CRON endpoint to generate recurring tasks
export async function GET(request: Request) {
  try {
    // Authenticate the CRON request if necessary
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'secret'}` && process.env.NODE_ENV === 'production') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const spawnedCount = await generateRecurringTasks()

    return NextResponse.json({
      success: true,
      message: `Génération des tâches récurrentes terminée. ${spawnedCount} nouvelle(s) tâche(s) générée(s).`,
      spawnedCount
    })
  } catch (error: any) {
    console.error('Failed to generate recurring tasks via CRON:', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
