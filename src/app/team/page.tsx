'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import {
  Users,
  UserPlus,
  Mail,
  MoreVertical,
  Shield,
  Trash2,
  RefreshCw,
  X,
  Crown,
  ShieldCheck,
  UserCog,
  User
} from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { toast } from 'sonner'

const roleIcons = {
  OWNER: Crown,
  ADMIN: ShieldCheck,
  MANAGER: UserCog,
  STAFF: User,
}

const roleColors = {
  OWNER: 'text-yellow-600 bg-yellow-100',
  ADMIN: 'text-purple-600 bg-purple-100',
  MANAGER: 'text-blue-600 bg-blue-100',
  STAFF: 'text-gray-600 bg-gray-100',
}

export default function TeamPage() {
  const { data: session, status } = useSession()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF'>('STAFF')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Fetch team members
  const { data: members, isLoading: membersLoading } = trpc.team.getTeamMembers.useQuery()
  const { data: invitations, isLoading: invitationsLoading } = trpc.team.getPendingInvitations.useQuery()

  // Mutations
  const inviteMutation = trpc.team.inviteTeamMember.useMutation({
    onSuccess: () => {
      toast.success('Invitation sent successfully')
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('STAFF')
      utils.team.getPendingInvitations.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateRoleMutation = trpc.team.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success('Role updated successfully')
      utils.team.getTeamMembers.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const removeMutation = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      toast.success('Team member removed')
      utils.team.getTeamMembers.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const resendInvitationMutation = trpc.team.resendInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation resent')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const cancelInvitationMutation = trpc.team.cancelInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation cancelled')
      utils.team.getPendingInvitations.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleInvite = () => {
    if (!inviteEmail || !inviteName) {
      toast.error('Please enter name and email')
      return
    }

    inviteMutation.mutate({
      email: inviteEmail,
      name: inviteName,
      role: inviteRole,
    })
  }

  const handleUpdateRole = (userId: string, role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF') => {
    updateRoleMutation.mutate({ userId, role })
  }

  const handleRemoveMember = (userId: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      removeMutation.mutate({ userId })
    }
  }

  if (status === 'loading' || membersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading team...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Please sign in to access this page.</div>
      </div>
    )
  }

  const canInvite = ['OWNER', 'ADMIN'].includes(session.user.role)
  const canManageRoles = session.user.role === 'OWNER'

  return (
    <DashboardLayout
      title="Team Management"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Team' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-gray-700" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
              <p className="text-sm text-gray-500">
                {members?.length || 0} active members
              </p>
            </div>
          </div>

          {canInvite && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </button>
          )}
        </div>

        {/* Team Members List */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                {(canInvite || canManageRoles) && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members && members.length > 0 ? (
                members.map((member) => {
                  const RoleIcon = roleIcons[member.role]
                  const isCurrentUser = member.id === session.user.id

                  return (
                    <tr key={member.id} className={isCurrentUser ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {member.image ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={member.image}
                                alt=""
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.name || 'No name'}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-blue-600">(You)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {canManageRoles && !isCurrentUser ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateRole(
                                member.id,
                                e.target.value as 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF'
                              )
                            }
                            className="text-sm border-gray-300 rounded-md"
                          >
                            <option value="OWNER">Owner</option>
                            <option value="ADMIN">Admin</option>
                            <option value="MANAGER">Manager</option>
                            <option value="STAFF">Staff</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              roleColors[member.role]
                            }`}
                          >
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {member.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.emailVerified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      {(canInvite || canManageRoles) && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!isCurrentUser && canInvite && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No team members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pending Invitations */}
        {canInvite && invitations && invitations.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Pending Invitations</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {invitation.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invitation.expires).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => resendInvitationMutation.mutate({ invitationId: invitation.id })}
                        className="text-blue-600 hover:text-blue-900"
                        title="Resend invitation"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => cancelInvitationMutation.mutate({ invitationId: invitation.id })}
                        className="text-red-600 hover:text-red-900"
                        title="Cancel invitation"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF')
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OWNER">Owner</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Staff members have basic access. Managers can manage content. Admins can
                    invite members. Owners have full control.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviteMutation.isPending}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
