import prisma from '@/lib/prisma'
import { Role as DbRole } from '@prisma/client'

export type Role = 
  | 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'READONLY'
  | 'ADMINISTRATEUR' | 'SUPERVISEUR' | 'COORDINATEUR'

export type Permission =
  | 'VIEW_CONTACTS' | 'CREATE_CONTACTS' | 'EDIT_CONTACTS' | 'ARCHIVE_CONTACTS' | 'EXPORT_CONTACTS'
  | 'VIEW_SENSITIVE_TAGS' | 'MANAGE_TAGS'
  | 'VIEW_SUPPORT_LEVEL' | 'EDIT_SUPPORT_LEVEL'
  | 'MANAGE_TASKS'
  | 'MANAGE_MAILS'
  | 'MANAGE_QE'
  | 'VIEW_DOCUMENTS' | 'UPLOAD_DOCUMENTS' | 'DOWNLOAD_DOCUMENTS' | 'MANAGE_DOCUMENTS'
  | 'VIEW_PLANNING' | 'MANAGE_PLANNING' | 'EDIT_QUOTAS'
  | 'MANAGE_USERS' | 'MANAGE_ROLES'
  | 'MANAGE_SETTINGS' | 'MANAGE_API'
  | 'VIEW_AUDIT_LOG' | 'MANAGE_BACKUPS' | 'MAINTENANCE_ACCESS'

// Fallback static permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPERADMIN: [
    'VIEW_CONTACTS', 'CREATE_CONTACTS', 'EDIT_CONTACTS', 'ARCHIVE_CONTACTS', 'EXPORT_CONTACTS',
    'VIEW_SENSITIVE_TAGS', 'MANAGE_TAGS',
    'VIEW_SUPPORT_LEVEL', 'EDIT_SUPPORT_LEVEL',
    'MANAGE_TASKS', 'MANAGE_MAILS', 'MANAGE_QE',
    'VIEW_DOCUMENTS', 'UPLOAD_DOCUMENTS', 'DOWNLOAD_DOCUMENTS', 'MANAGE_DOCUMENTS',
    'VIEW_PLANNING', 'MANAGE_PLANNING', 'EDIT_QUOTAS',
    'MANAGE_USERS', 'MANAGE_ROLES',
    'MANAGE_SETTINGS', 'MANAGE_API',
    'VIEW_AUDIT_LOG', 'MANAGE_BACKUPS', 'MAINTENANCE_ACCESS'
  ],
  ADMIN: [
    'VIEW_CONTACTS', 'CREATE_CONTACTS', 'EDIT_CONTACTS', 'ARCHIVE_CONTACTS', 'EXPORT_CONTACTS',
    'VIEW_SENSITIVE_TAGS', 'MANAGE_TAGS',
    'VIEW_SUPPORT_LEVEL', 'EDIT_SUPPORT_LEVEL',
    'MANAGE_TASKS', 'MANAGE_MAILS', 'MANAGE_QE',
    'VIEW_DOCUMENTS', 'UPLOAD_DOCUMENTS', 'DOWNLOAD_DOCUMENTS', 'MANAGE_DOCUMENTS',
    'VIEW_PLANNING', 'MANAGE_PLANNING', 'EDIT_QUOTAS',
    'MANAGE_USERS',
    'MANAGE_SETTINGS',
    'VIEW_AUDIT_LOG'
  ],
  MANAGER: [
    'VIEW_CONTACTS', 'CREATE_CONTACTS', 'EDIT_CONTACTS',
    'VIEW_SENSITIVE_TAGS',
    'MANAGE_TASKS', 'MANAGE_MAILS', 'MANAGE_QE',
    'VIEW_DOCUMENTS', 'UPLOAD_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
    'VIEW_PLANNING', 'MANAGE_PLANNING'
  ],
  USER: [ // Legacy USER
    'VIEW_CONTACTS', 'CREATE_CONTACTS', 'EDIT_CONTACTS',
    'MANAGE_TASKS', 'MANAGE_MAILS', 'MANAGE_QE',
    'VIEW_DOCUMENTS', 'UPLOAD_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
    'VIEW_PLANNING'
  ],
  READONLY: [
    'VIEW_CONTACTS', 'VIEW_DOCUMENTS', 'VIEW_PLANNING'
  ]
}

// Populate raw roles based on legacy mappings in static definitions
ROLE_PERMISSIONS.ADMINISTRATEUR = ROLE_PERMISSIONS.SUPERADMIN
ROLE_PERMISSIONS.SUPERVISEUR = ROLE_PERMISSIONS.ADMIN
ROLE_PERMISSIONS.COORDINATEUR = ROLE_PERMISSIONS.USER
// Raw USER gets legacy READONLY permissions
ROLE_PERMISSIONS.USER_RAW = ROLE_PERMISSIONS.READONLY

// Dynamic cache
export let rolePermissionsCache: Record<string, string[]> | null = null

export function isPermissionsCacheLoaded(): boolean {
  return rolePermissionsCache !== null
}

export async function refreshPermissionsCache() {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      include: { permission: true }
    })
    
    const cache: Record<string, string[]> = {
      ADMINISTRATEUR: [],
      SUPERVISEUR: [],
      COORDINATEUR: [],
      USER: [], // Raw USER
      SUPERADMIN: [],
      ADMIN: [],
      MANAGER: [],
      READONLY: []
    }
    
    for (const rp of rolePermissions) {
      const pKey = rp.permission.key
      const dbRole = rp.role // raw role enum
      
      // Add to raw role
      if (cache[dbRole] && !cache[dbRole].includes(pKey)) {
        cache[dbRole].push(pKey)
      }
      
      // Map to legacy role for backwards compatibility
      let legacyRole = 'READONLY'
      if (dbRole === 'ADMINISTRATEUR') legacyRole = 'SUPERADMIN'
      else if (dbRole === 'SUPERVISEUR') legacyRole = 'ADMIN'
      else if (dbRole === 'COORDINATEUR') legacyRole = 'USER'
      
      if (cache[legacyRole] && !cache[legacyRole].includes(pKey)) {
        cache[legacyRole].push(pKey)
      }
      
      // Also copy to MANAGER (legacy) from COORDINATEUR
      if (dbRole === 'COORDINATEUR') {
        if (!cache['MANAGER'].includes(pKey)) {
          cache['MANAGER'].push(pKey)
        }
      }
    }
    
    // Raw USER gets the permissions of raw USER in the DB
    rolePermissionsCache = cache
  } catch (err) {
    console.error('Failed to refresh permissions cache:', err)
  }
}

const PERMISSION_MAPPING: Record<Permission, string[]> = {
  VIEW_CONTACTS: ['contacts.read'],
  CREATE_CONTACTS: ['contacts.create'],
  EDIT_CONTACTS: ['contacts.update'],
  ARCHIVE_CONTACTS: ['contacts.delete'],
  EXPORT_CONTACTS: ['contacts.export', 'contacts.read'],
  VIEW_SENSITIVE_TAGS: ['contacts.read'],
  MANAGE_TAGS: ['contacts.update', 'tasks.update'],
  VIEW_SUPPORT_LEVEL: ['contacts.read'],
  EDIT_SUPPORT_LEVEL: ['contacts.update'],
  MANAGE_TASKS: ['tasks.create', 'tasks.update', 'tasks.delete'],
  MANAGE_MAILS: ['mailcases.create', 'mailcases.update', 'mailcases.delete'],
  MANAGE_QE: ['questions.create', 'questions.update', 'questions.delete'],
  VIEW_DOCUMENTS: ['mailcases.read', 'contacts.read', 'tasks.read', 'questions.read'],
  UPLOAD_DOCUMENTS: ['mailcases.create', 'contacts.create', 'tasks.create', 'questions.create'],
  DOWNLOAD_DOCUMENTS: ['mailcases.read', 'contacts.read', 'tasks.read', 'questions.read'],
  MANAGE_DOCUMENTS: ['mailcases.update', 'contacts.update', 'tasks.update', 'questions.update'],
  VIEW_PLANNING: ['agenda.read'],
  MANAGE_PLANNING: ['agenda.create', 'agenda.update', 'agenda.delete'],
  EDIT_QUOTAS: ['settings.manage'],
  MANAGE_USERS: ['users.manage'],
  MANAGE_ROLES: ['roles.manage'],
  MANAGE_SETTINGS: ['settings.manage'],
  MANAGE_API: ['settings.manage'],
  VIEW_AUDIT_LOG: ['audit.read'],
  MANAGE_BACKUPS: ['settings.manage'],
  MAINTENANCE_ACCESS: ['settings.manage'],
}

export function hasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false
  
  if (rolePermissionsCache) {
    const userPermissions = rolePermissionsCache[role] || []
    if (userPermissions.includes(permission)) return true
    
    const dbPermissions = PERMISSION_MAPPING[permission]
    if (dbPermissions && dbPermissions.some(dbPerm => userPermissions.includes(dbPerm))) {
      return true
    }
    
    // ADMINISTRATEUR and SUPERADMIN always have everything
    if (role === 'ADMINISTRATEUR' || role === 'SUPERADMIN') return true
    
    return false
  }
  
  // Fallback to static
  const lookupRole = role === 'USER' ? 'USER_RAW' : role
  return ROLE_PERMISSIONS[lookupRole]?.includes(permission) || false
}

export function requirePermission(role: string | undefined | null, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error(`Accès refusé. Permission requise: ${permission}`)
  }
}

