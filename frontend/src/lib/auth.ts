export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId?: string
  avatar?: string
  verified: boolean
  lastLogin?: Date
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ORGANIZATION_ADMIN = 'organization_admin', 
  GRANT_WRITER = 'grant_writer',
  VIEWER = 'viewer'
}

export interface Organization {
  id: string
  name: string
  description?: string
  location: string
  sector: string
  size: string
  website?: string
  logo?: string
  verified: boolean
  createdAt: Date
}

export const ROLE_PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: {
    canViewAllOrganizations: true,
    canManageAllUsers: true,
    canAccessAnalytics: true,
    canManageSystem: true,
    canViewAllGrants: true,
    canCreateGrants: true,
    canEditGrants: true,
    canDeleteGrants: true,
    canSubmitApplications: true,
    canViewApplications: true,
    canManageApplications: true,
  },
  [UserRole.ORGANIZATION_ADMIN]: {
    canViewAllOrganizations: false,
    canManageAllUsers: false,
    canAccessAnalytics: true,
    canManageSystem: false,
    canViewAllGrants: true,
    canCreateGrants: false,
    canEditGrants: false,
    canDeleteGrants: false,
    canSubmitApplications: true,
    canViewApplications: true,
    canManageApplications: true,
    canManageOrganizationUsers: true,
    canEditOrganization: true,
  },
  [UserRole.GRANT_WRITER]: {
    canViewAllOrganizations: false,
    canManageAllUsers: false,
    canAccessAnalytics: false,
    canManageSystem: false,
    canViewAllGrants: true,
    canCreateGrants: false,
    canEditGrants: false,
    canDeleteGrants: false,
    canSubmitApplications: true,
    canViewApplications: true,
    canManageApplications: false,
    canDraftApplications: true,
    canEditDraftApplications: true,
  },
  [UserRole.VIEWER]: {
    canViewAllOrganizations: false,
    canManageAllUsers: false,
    canAccessAnalytics: false,
    canManageSystem: false,
    canViewAllGrants: true,
    canCreateGrants: false,
    canEditGrants: false,
    canDeleteGrants: false,
    canSubmitApplications: false,
    canViewApplications: true,
    canManageApplications: false,
  },
}

export function hasPermission(user: User, permission: keyof typeof ROLE_PERMISSIONS[UserRole]) {
  return ROLE_PERMISSIONS[user.role][permission] || false
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Administrator'
    case UserRole.ORGANIZATION_ADMIN:
      return 'Organization Administrator'
    case UserRole.GRANT_WRITER:
      return 'Grant Writer'
    case UserRole.VIEWER:
      return 'Viewer'
    default:
      return 'Unknown Role'
  }
}