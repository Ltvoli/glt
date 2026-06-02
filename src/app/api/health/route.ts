import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // 1. Vérification de la Base de Données
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStartTime

    // 2. Vérification de l'Espace Disque (VPS Linux)
    let diskSpace = 'Inconnu'
    let diskUsagePercent = 0
    
    try {
      if (process.platform !== 'win32') {
        const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'")
        diskSpace = stdout.trim()
        diskUsagePercent = parseInt(diskSpace.replace('%', ''))
      } else {
        diskSpace = 'Non supporté sur Windows'
      }
    } catch (e) {
      diskSpace = 'Erreur lecture disque'
    }

    const isHealthy = dbLatency < 5000 && diskUsagePercent < 90

    return NextResponse.json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbLatency < 5000 ? 'up' : 'down',
          latency: `${dbLatency}ms`
        },
        disk: {
          usage: diskSpace,
          warning: diskUsagePercent >= 90
        }
      }
    }, { status: isHealthy ? 200 : 503 })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Service indisponible'
    }, { status: 500 })
  }
}
