'use client'

import { useState } from 'react'
import { 
  CheckSquare,
  Square,
  ChevronDown,
  Trash2,
  Play,
  Pause,
  Edit,
  Mail,
  Download,
  AlertTriangle
} from 'lucide-react'

interface BulkAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'default' | 'danger' | 'warning'
  requiresConfirmation?: boolean
  confirmationMessage?: string
}

interface BulkActionsProps {
  selectedItems: string[]
  totalItems: number
  onSelectAll: (selected: boolean) => void
  onDeselectAll: () => void
  onBulkAction: (actionId: string, itemIds: string[]) => Promise<void>
  actions: BulkAction[]
  className?: string
}

export default function BulkActions({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onBulkAction,
  actions,
  className = ''
}: BulkActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const allSelected = selectedItems.length === totalItems && totalItems > 0
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalItems
  const noneSelected = selectedItems.length === 0

  const handleSelectAllToggle = () => {
    if (allSelected) {
      onDeselectAll()
    } else {
      onSelectAll(true)
    }
  }

  const handleBulkAction = async (actionId: string) => {
    if (selectedItems.length === 0) return

    const action = actions.find(a => a.id === actionId)
    if (!action) return

    if (action.requiresConfirmation) {
      const message = action.confirmationMessage || 
        `Are you sure you want to ${action.label.toLowerCase()} ${selectedItems.length} items?`
      
      if (!confirm(message)) return
    }

    try {
      setLoading(actionId)
      await onBulkAction(actionId, selectedItems)
      onDeselectAll()
    } catch (error) {
      console.error('Bulk action failed:', error)
      alert('Bulk action failed. Please try again.')
    } finally {
      setLoading(null)
      setIsOpen(false)
    }
  }

  const getActionButtonVariant = (variant: string) => {
    switch (variant) {
      case 'danger':
        return 'text-red-700 hover:bg-red-50'
      case 'warning':
        return 'text-yellow-700 hover:bg-yellow-50'
      default:
        return 'text-gray-700 hover:bg-gray-50'
    }
  }

  if (totalItems === 0) return null

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelectAllToggle}
              className="flex items-center justify-center w-4 h-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-red-600" />
              ) : someSelected ? (
                <div className="w-2 h-2 bg-red-600 rounded-sm" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            <div className="text-sm text-gray-700">
              {selectedItems.length === 0 ? (
                `Select items for bulk actions`
              ) : (
                `${selectedItems.length} of ${totalItems} items selected`
              )}
            </div>
          </div>

          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onDeselectAll()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Bulk Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>

                {isOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      {actions.map((action) => {
                        const Icon = action.icon
                        return (
                          <button
                            key={action.id}
                            onClick={() => handleBulkAction(action.id)}
                            disabled={loading !== null}
                            className={`${getActionButtonVariant(action.variant)} group flex items-center px-4 py-2 text-sm w-full text-left disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {loading === action.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-3" />
                            ) : (
                              <Icon className="mr-3 h-4 w-4" />
                            )}
                            {action.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Predefined action sets for different resource types
export const userBulkActions: BulkAction[] = [
  {
    id: 'activate',
    label: 'Activate Selected',
    icon: Play,
    variant: 'default'
  },
  {
    id: 'deactivate',
    label: 'Deactivate Selected',
    icon: Pause,
    variant: 'warning',
    requiresConfirmation: true
  },
  {
    id: 'send_email',
    label: 'Send Email',
    icon: Mail,
    variant: 'default'
  },
  {
    id: 'export',
    label: 'Export Selected',
    icon: Download,
    variant: 'default'
  },
  {
    id: 'delete',
    label: 'Delete Selected',
    icon: Trash2,
    variant: 'danger',
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to delete the selected users? This action cannot be undone.'
  }
]

export const organizationBulkActions: BulkAction[] = [
  {
    id: 'activate',
    label: 'Activate Selected',
    icon: Play,
    variant: 'default'
  },
  {
    id: 'suspend',
    label: 'Suspend Selected',
    icon: Pause,
    variant: 'warning',
    requiresConfirmation: true
  },
  {
    id: 'export',
    label: 'Export Selected',
    icon: Download,
    variant: 'default'
  },
  {
    id: 'bulk_edit',
    label: 'Bulk Edit',
    icon: Edit,
    variant: 'default'
  }
]

export const subscriptionBulkActions: BulkAction[] = [
  {
    id: 'cancel',
    label: 'Cancel Selected',
    icon: Pause,
    variant: 'danger',
    requiresConfirmation: true
  },
  {
    id: 'extend',
    label: 'Extend Selected',
    icon: Play,
    variant: 'default'
  },
  {
    id: 'export',
    label: 'Export Selected',
    icon: Download,
    variant: 'default'
  },
  {
    id: 'send_reminder',
    label: 'Send Payment Reminder',
    icon: Mail,
    variant: 'default'
  }
]