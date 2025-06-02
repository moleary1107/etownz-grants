"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Badge } from "../../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Sidebar } from "../../../components/layout/Sidebar"
import { 
  Users, 
  UserPlus, 
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  UserCheck,
  AlertCircle,
  Settings,
  Download
} from "lucide-react"
import { User, UserRole, hasPermission, getRoleDisplayName } from "../../../lib/auth"

interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'pending' | 'suspended'
  lastLogin?: Date
  joinedDate: Date
  organizationId: string
  avatar?: string
  permissions: string[]
  applicationsCount: number
  lastActivity: string
}

interface Invitation {
  id: string
  email: string
  role: UserRole
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
  status: 'pending' | 'accepted' | 'expired'
}

export default function UsersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newInvite, setNewInvite] = useState({ email: '', role: UserRole.VIEWER })
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    try {
      const userData = JSON.parse(userStr)
      setUser(userData)

      // Check if user has permission to manage users
      if (!hasPermission(userData, 'canManageAllUsers') && !hasPermission(userData, 'canManageOrganizationUsers')) {
        router.push('/dashboard')
        return
      }

      loadTeamData()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadTeamData = async () => {
    try {
      setIsLoading(true)
      
      // Mock data - in real app, fetch from API
      const mockTeamMembers: TeamMember[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@techinnovation.ie',
          role: UserRole.ORGANIZATION_ADMIN,
          status: 'active',
          lastLogin: new Date('2025-06-02T09:30:00'),
          joinedDate: new Date('2024-03-15'),
          organizationId: 'org-1',
          applicationsCount: 8,
          lastActivity: 'Reviewed grant application',
          permissions: ['canManageApplications', 'canAccessAnalytics']
        },
        {
          id: '2',
          name: 'Michael Chen',
          email: 'michael.chen@techinnovation.ie',
          role: UserRole.GRANT_WRITER,
          status: 'active',
          lastLogin: new Date('2025-06-01T16:45:00'),
          joinedDate: new Date('2024-08-22'),
          organizationId: 'org-1',
          applicationsCount: 12,
          lastActivity: 'Submitted EI Innovation Partnership application',
          permissions: ['canSubmitApplications', 'canDraftApplications']
        },
        {
          id: '3',
          name: 'Emma O\'Sullivan',
          email: 'emma.osullivan@techinnovation.ie',
          role: UserRole.GRANT_WRITER,
          status: 'active',
          lastLogin: new Date('2025-06-02T08:15:00'),
          joinedDate: new Date('2024-11-10'),
          organizationId: 'org-1',
          applicationsCount: 5,
          lastActivity: 'Created new application draft',
          permissions: ['canSubmitApplications', 'canDraftApplications']
        },
        {
          id: '4',
          name: 'David Walsh',
          email: 'david.walsh@techinnovation.ie',
          role: UserRole.VIEWER,
          status: 'pending',
          joinedDate: new Date('2025-05-28'),
          organizationId: 'org-1',
          applicationsCount: 0,
          lastActivity: 'Account created',
          permissions: ['canViewApplications']
        }
      ]

      const mockInvitations: Invitation[] = [
        {
          id: 'inv-1',
          email: 'john.murphy@example.com',
          role: UserRole.GRANT_WRITER,
          invitedBy: 'Sarah Johnson',
          invitedAt: new Date('2025-05-30'),
          expiresAt: new Date('2025-06-06'),
          status: 'pending'
        },
        {
          id: 'inv-2',
          email: 'lisa.kelly@example.com',
          role: UserRole.VIEWER,
          invitedBy: 'Sarah Johnson',
          invitedAt: new Date('2025-05-25'),
          expiresAt: new Date('2025-06-01'),
          status: 'expired'
        }
      ]

      setTeamMembers(mockTeamMembers)
      setInvitations(mockInvitations)
    } catch (error) {
      console.error('Error loading team data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handleInviteUser = async () => {
    try {
      // Validate email
      if (!newInvite.email || !newInvite.email.includes('@')) {
        alert('Please enter a valid email address')
        return
      }

      // Check if user already exists or has pending invitation
      const existingUser = teamMembers.find(member => member.email === newInvite.email)
      const existingInvite = invitations.find(inv => inv.email === newInvite.email && inv.status === 'pending')
      
      if (existingUser) {
        alert('User already exists in your organization')
        return
      }
      
      if (existingInvite) {
        alert('Invitation already sent to this email')
        return
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Add new invitation
      const newInvitation: Invitation = {
        id: `inv-${Date.now()}`,
        email: newInvite.email,
        role: newInvite.role,
        invitedBy: user?.name || 'Admin',
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending'
      }

      setInvitations([newInvitation, ...invitations])
      setNewInvite({ email: '', role: UserRole.VIEWER })
      setShowInviteModal(false)
      
      alert('Invitation sent successfully!')
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation')
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Update invitation
      setInvitations(invitations.map(inv => 
        inv.id === invitationId 
          ? { ...inv, invitedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'pending' as const }
          : inv
      ))
      
      alert('Invitation resent successfully!')
    } catch (error) {
      console.error('Error resending invitation:', error)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      if (!confirm('Are you sure you want to revoke this invitation?')) return
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setInvitations(invitations.filter(inv => inv.id !== invitationId))
      alert('Invitation revoked successfully!')
    } catch (error) {
      console.error('Error revoking invitation:', error)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setTeamMembers(teamMembers.map(member =>
        member.id === userId ? { ...member, role: newRole } : member
      ))
      
      alert('User role updated successfully!')
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      if (!confirm('Are you sure you want to suspend this user?')) return
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setTeamMembers(teamMembers.map(member =>
        member.id === userId ? { ...member, status: 'suspended' as const } : member
      ))
      
      alert('User suspended successfully!')
    } catch (error) {
      console.error('Error suspending user:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'suspended': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'bg-purple-100 text-purple-800'
      case UserRole.ORGANIZATION_ADMIN: return 'bg-blue-100 text-blue-800'
      case UserRole.GRANT_WRITER: return 'bg-green-100 text-green-800'
      case UserRole.VIEWER: return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = !searchTerm || 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Team Management
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage your team members and their permissions
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold text-blue-600">{teamMembers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-green-600">
                      {teamMembers.filter(m => m.status === 'active').length}
                    </p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Invites</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {invitations.filter(i => i.status === 'pending').length}
                    </p>
                  </div>
                  <Mail className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Grant Writers</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {teamMembers.filter(m => m.role === UserRole.GRANT_WRITER).length}
                    </p>
                  </div>
                  <Edit className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="team-members" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="team-members">Team Members</TabsTrigger>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
            </TabsList>

            {/* Team Members Tab */}
            <TabsContent value="team-members" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search team members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Roles</option>
                  <option value={UserRole.ORGANIZATION_ADMIN}>Organization Admin</option>
                  <option value={UserRole.GRANT_WRITER}>Grant Writer</option>
                  <option value={UserRole.VIEWER}>Viewer</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Team Members List */}
              <div className="space-y-4">
                {filteredTeamMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-medium text-blue-600">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {member.name}
                              </h3>
                              {getStatusIcon(member.status)}
                              <Badge className={getStatusColor(member.status)}>
                                {member.status.toUpperCase()}
                              </Badge>
                              <Badge className={getRoleColor(member.role)}>
                                {getRoleDisplayName(member.role)}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{member.email}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Applications: </span>
                                {member.applicationsCount}
                              </div>
                              <div>
                                <span className="font-medium">Joined: </span>
                                {member.joinedDate.toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">Last Login: </span>
                                {member.lastLogin ? member.lastLogin.toLocaleDateString() : 'Never'}
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-500 mt-2">
                              <span className="font-medium">Last Activity: </span>
                              {member.lastActivity}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 lg:mt-0 lg:ml-6">
                          {hasPermission(user, 'canManageAllUsers') && member.id !== user.id && (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateUserRole(member.id, e.target.value as UserRole)}
                                className="text-sm border rounded px-2 py-1"
                              >
                                <option value={UserRole.VIEWER}>Viewer</option>
                                <option value={UserRole.GRANT_WRITER}>Grant Writer</option>
                                <option value={UserRole.ORGANIZATION_ADMIN}>Org Admin</option>
                              </select>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuspendUser(member.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredTeamMembers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'Try adjusting your search criteria or filters'
                        : 'Start by inviting team members to your organization'
                      }
                    </p>
                    <Button onClick={() => setShowInviteModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Team Member
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Invitations Tab */}
            <TabsContent value="invitations" className="space-y-6">
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <Card key={invitation.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {invitation.email}
                            </h3>
                            <Badge className={
                              invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {invitation.status.toUpperCase()}
                            </Badge>
                            <Badge className={getRoleColor(invitation.role)}>
                              {getRoleDisplayName(invitation.role)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Invited by: </span>
                              {invitation.invitedBy}
                            </div>
                            <div>
                              <span className="font-medium">Invited: </span>
                              {invitation.invitedAt.toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Expires: </span>
                              {invitation.expiresAt.toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 lg:mt-0 lg:ml-6">
                          {invitation.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation.id)}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Resend
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {invitations.length === 0 && (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations sent</h3>
                    <p className="text-gray-600 mb-4">
                      You haven't sent any invitations yet
                    </p>
                    <Button onClick={() => setShowInviteModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Invitation
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Invite User Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4">Invite Team Member</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <Input
                      type="email"
                      value={newInvite.email}
                      onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={newInvite.role}
                      onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value as UserRole })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value={UserRole.VIEWER}>Viewer</option>
                      <option value={UserRole.GRANT_WRITER}>Grant Writer</option>
                      {hasPermission(user, 'canManageAllUsers') && (
                        <option value={UserRole.ORGANIZATION_ADMIN}>Organization Admin</option>
                      )}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInviteModal(false)
                      setNewInvite({ email: '', role: UserRole.VIEWER })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleInviteUser}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}