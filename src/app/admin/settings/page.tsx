'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/admin-layout'
import { 
  Settings, 
  Save,
  Mail,
  Database,
  Shield,
  Globe,
  Bell,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Info,
  Key,
  Server,
  Clock,
  Users,
  Building2
} from 'lucide-react'

interface SystemSettings {
  general: {
    siteName: string
    siteUrl: string
    supportEmail: string
    maintenanceMode: boolean
    registrationEnabled: boolean
    defaultTimezone: string
    defaultCurrency: string
  }
  email: {
    provider: 'resend' | 'smtp' | 'sendgrid'
    fromEmail: string
    fromName: string
    replyToEmail: string
    smtpHost?: string
    smtpPort?: number
    smtpUsername?: string
    apiKey?: string
  }
  security: {
    sessionTimeout: number
    passwordMinLength: number
    requireEmailVerification: boolean
    maxLoginAttempts: number
    lockoutDuration: number
    twoFactorRequired: boolean
    allowedDomains: string[]
  }
  billing: {
    defaultPlan: string
    trialDuration: number
    gracePeriodDays: number
    allowDowngrades: boolean
    prorate: boolean
    taxRate: number
  }
  limits: {
    maxOrganizationsPerUser: number
    maxUsersPerOrganization: number
    maxRestaurantsPerOrganization: number
    apiRateLimit: number
    fileUploadMaxSize: number
  }
  notifications: {
    systemAlerts: boolean
    emailNotifications: boolean
    slackWebhook?: string
    discordWebhook?: string
  }
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: 'Tightship PMS',
      siteUrl: 'https://tightship.com',
      supportEmail: 'support@tightship.com',
      maintenanceMode: false,
      registrationEnabled: true,
      defaultTimezone: 'Europe/London',
      defaultCurrency: 'GBP'
    },
    email: {
      provider: 'resend',
      fromEmail: 'noreply@tightship.com',
      fromName: 'Tightship PMS',
      replyToEmail: 'support@tightship.com',
      apiKey: '••••••••••••••••'
    },
    security: {
      sessionTimeout: 24,
      passwordMinLength: 8,
      requireEmailVerification: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      twoFactorRequired: false,
      allowedDomains: []
    },
    billing: {
      defaultPlan: 'FREE',
      trialDuration: 14,
      gracePeriodDays: 7,
      allowDowngrades: true,
      prorate: true,
      taxRate: 20
    },
    limits: {
      maxOrganizationsPerUser: 1,
      maxUsersPerOrganization: 50,
      maxRestaurantsPerOrganization: 10,
      apiRateLimit: 1000,
      fileUploadMaxSize: 10
    },
    notifications: {
      systemAlerts: true,
      emailNotifications: true,
      slackWebhook: '',
      discordWebhook: ''
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (section: keyof SystemSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const tabs = [
    { id: 'general', name: 'General', icon: Globe },
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'limits', name: 'Limits', icon: Database },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ]

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Site Name</label>
        <input
          type="text"
          value={settings.general.siteName}
          onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Site URL</label>
        <input
          type="url"
          value={settings.general.siteUrl}
          onChange={(e) => handleInputChange('general', 'siteUrl', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Support Email</label>
        <input
          type="email"
          value={settings.general.supportEmail}
          onChange={(e) => handleInputChange('general', 'supportEmail', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Default Timezone</label>
        <select
          value={settings.general.defaultTimezone}
          onChange={(e) => handleInputChange('general', 'defaultTimezone', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        >
          <option value="Europe/London">Europe/London</option>
          <option value="America/New_York">America/New_York</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
          <option value="Australia/Sydney">Australia/Sydney</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Default Currency</label>
        <select
          value={settings.general.defaultCurrency}
          onChange={(e) => handleInputChange('general', 'defaultCurrency', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        >
          <option value="GBP">GBP (£)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
        </select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.general.maintenanceMode}
            onChange={(e) => handleInputChange('general', 'maintenanceMode', e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Maintenance Mode
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.general.registrationEnabled}
            onChange={(e) => handleInputChange('general', 'registrationEnabled', e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Allow New Registrations
          </label>
        </div>
      </div>
    </div>
  )

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email Provider</label>
        <select
          value={settings.email.provider}
          onChange={(e) => handleInputChange('email', 'provider', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        >
          <option value="resend">Resend</option>
          <option value="smtp">SMTP</option>
          <option value="sendgrid">SendGrid</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From Email</label>
          <input
            type="email"
            value={settings.email.fromEmail}
            onChange={(e) => handleInputChange('email', 'fromEmail', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">From Name</label>
          <input
            type="text"
            value={settings.email.fromName}
            onChange={(e) => handleInputChange('email', 'fromName', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Reply-To Email</label>
        <input
          type="email"
          value={settings.email.replyToEmail}
          onChange={(e) => handleInputChange('email', 'replyToEmail', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">API Key</label>
        <input
          type="password"
          value={settings.email.apiKey}
          onChange={(e) => handleInputChange('email', 'apiKey', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          API key for your email provider
        </p>
      </div>

      {settings.email.provider === 'smtp' && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700">SMTP Configuration</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
              <input
                type="text"
                value={settings.email.smtpHost || ''}
                onChange={(e) => handleInputChange('email', 'smtpHost', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
              <input
                type="number"
                value={settings.email.smtpPort || ''}
                onChange={(e) => handleInputChange('email', 'smtpPort', parseInt(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">SMTP Username</label>
            <input
              type="text"
              value={settings.email.smtpUsername || ''}
              onChange={(e) => handleInputChange('email', 'smtpUsername', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Session Timeout (hours)</label>
          <input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Minimum Password Length</label>
          <input
            type="number"
            value={settings.security.passwordMinLength}
            onChange={(e) => handleInputChange('security', 'passwordMinLength', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Login Attempts</label>
          <input
            type="number"
            value={settings.security.maxLoginAttempts}
            onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Lockout Duration (minutes)</label>
          <input
            type="number"
            value={settings.security.lockoutDuration}
            onChange={(e) => handleInputChange('security', 'lockoutDuration', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.security.requireEmailVerification}
            onChange={(e) => handleInputChange('security', 'requireEmailVerification', e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Require Email Verification
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.security.twoFactorRequired}
            onChange={(e) => handleInputChange('security', 'twoFactorRequired', e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Require Two-Factor Authentication
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Allowed Domains</label>
        <textarea
          value={settings.security.allowedDomains.join('\n')}
          onChange={(e) => handleInputChange('security', 'allowedDomains', e.target.value.split('\n').filter(d => d.trim()))}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          placeholder="example.com&#10;company.org"
        />
        <p className="mt-1 text-xs text-gray-500">
          One domain per line. Leave empty to allow all domains.
        </p>
      </div>
    </div>
  )

  const renderBillingSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Plan</label>
          <select
            value={settings.billing.defaultPlan}
            onChange={(e) => handleInputChange('billing', 'defaultPlan', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          >
            <option value="FREE">Free</option>
            <option value="STARTER">Starter</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Trial Duration (days)</label>
          <input
            type="number"
            value={settings.billing.trialDuration}
            onChange={(e) => handleInputChange('billing', 'trialDuration', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Grace Period (days)</label>
          <input
            type="number"
            value={settings.billing.gracePeriodDays}
            onChange={(e) => handleInputChange('billing', 'gracePeriodDays', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
          <input
            type="number"
            step="0.01"
            value={settings.billing.taxRate}
            onChange={(e) => handleInputChange('billing', 'taxRate', parseFloat(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.billing.allowDowngrades}
            onChange={(e) => handleInputChange('billing', 'allowDowngrades', e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Allow Plan Downgrades
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.billing.prorate}
            onChange={(e) => handleInputChange('billing', 'prorate', e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Prorate Plan Changes
          </label>
        </div>
      </div>
    </div>
  )

  const renderLimitsSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Organizations per User</label>
          <input
            type="number"
            value={settings.limits.maxOrganizationsPerUser}
            onChange={(e) => handleInputChange('limits', 'maxOrganizationsPerUser', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Users per Organization</label>
          <input
            type="number"
            value={settings.limits.maxUsersPerOrganization}
            onChange={(e) => handleInputChange('limits', 'maxUsersPerOrganization', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Restaurants per Organization</label>
          <input
            type="number"
            value={settings.limits.maxRestaurantsPerOrganization}
            onChange={(e) => handleInputChange('limits', 'maxRestaurantsPerOrganization', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">API Rate Limit (per hour)</label>
          <input
            type="number"
            value={settings.limits.apiRateLimit}
            onChange={(e) => handleInputChange('limits', 'apiRateLimit', parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">File Upload Max Size (MB)</label>
        <input
          type="number"
          value={settings.limits.fileUploadMaxSize}
          onChange={(e) => handleInputChange('limits', 'fileUploadMaxSize', parseInt(e.target.value))}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
        />
      </div>
    </div>
  )

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.notifications.systemAlerts}
            onChange={(e) => handleInputChange('notifications', 'systemAlerts', e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            System Alerts
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.notifications.emailNotifications}
            onChange={(e) => handleInputChange('notifications', 'emailNotifications', e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Email Notifications
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Slack Webhook URL</label>
        <input
          type="url"
          value={settings.notifications.slackWebhook || ''}
          onChange={(e) => handleInputChange('notifications', 'slackWebhook', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          placeholder="https://hooks.slack.com/services/..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Discord Webhook URL</label>
        <input
          type="url"
          value={settings.notifications.discordWebhook || ''}
          onChange={(e) => handleInputChange('notifications', 'discordWebhook', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
          placeholder="https://discord.com/api/webhooks/..."
        />
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings()
      case 'email': return renderEmailSettings()
      case 'security': return renderSecuritySettings()
      case 'billing': return renderBillingSettings()
      case 'limits': return renderLimitsSettings()
      case 'notifications': return renderNotificationsSettings()
      default: return renderGeneralSettings()
    }
  }

  return (
    <AdminLayout 
      title="System Settings" 
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Settings' }]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="mt-2 text-sm text-gray-700">
              Configure system-wide settings and preferences
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="px-6 py-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Save status */}
        {saveStatus && (
          <div className={`mt-6 rounded-md p-4 ${
            saveStatus.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              {saveStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  saveStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {saveStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}