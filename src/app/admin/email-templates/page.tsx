'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/admin-layout'
import { 
  Mail,
  Edit,
  Eye,
  Send,
  Copy,
  Save,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  Code,
  Type,
  Image,
  Link,
  Palette
} from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  type: 'welcome' | 'verification' | 'password_reset' | 'subscription' | 'usage_limit' | 'custom'
  status: 'active' | 'draft'
  htmlContent: string
  textContent: string
  variables: string[]
  lastUpdated: string
  usageCount: number
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{siteName}}!',
      type: 'welcome',
      status: 'active',
      htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to {{siteName}}!</h1>
  </div>
  
  <div style="padding: 40px 20px; background: white;">
    <h2 style="color: #374151; margin-bottom: 20px;">Hi {{userName}},</h2>
    
    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
      Welcome to Tightship PMS! We're excited to have you join our community of restaurant owners 
      and managers who are transforming their operations with our platform.
    </p>
    
    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 30px;">
      Here's what you can do next:
    </p>
    
    <ul style="color: #6b7280; line-height: 1.8; margin-bottom: 30px;">
      <li>Complete your profile setup</li>
      <li>Add your first restaurant</li>
      <li>Import your menu items</li>
      <li>Connect to delivery platforms</li>
    </ul>
    
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{dashboardUrl}}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Get Started
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      If you have any questions, feel free to reach out to our support team at 
      <a href="mailto:{{supportEmail}}" style="color: #dc2626;">{{supportEmail}}</a>
    </p>
  </div>
  
  <div style="padding: 20px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280;">
    <p>© 2024 {{siteName}}. All rights reserved.</p>
  </div>
</div>`,
      textContent: `Welcome to {{siteName}}!

Hi {{userName}},

Welcome to Tightship PMS! We're excited to have you join our community.

Here's what you can do next:
- Complete your profile setup
- Add your first restaurant
- Import your menu items
- Connect to delivery platforms

Get started: {{dashboardUrl}}

Questions? Contact us at {{supportEmail}}

© 2024 {{siteName}}. All rights reserved.`,
      variables: ['siteName', 'userName', 'dashboardUrl', 'supportEmail'],
      lastUpdated: new Date().toISOString(),
      usageCount: 156
    },
    {
      id: 'verification',
      name: 'Email Verification',
      subject: 'Verify your email address',
      type: 'verification',
      status: 'active',
      htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="padding: 40px 20px; background: white;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #dc2626; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 24px;">✓</span>
      </div>
      <h1 style="color: #111827; margin: 0; font-size: 24px;">Verify Your Email</h1>
    </div>
    
    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 30px;">
      Hi {{userName}},
    </p>
    
    <p style="color: #6b7280; line-height: 1.6; margin-bottom: 30px;">
      Please click the button below to verify your email address and complete your account setup.
    </p>
    
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{verificationUrl}}" style="background: #dc2626; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Verify Email Address
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
      This verification link will expire in {{expirationHours}} hours.
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
      If you didn't create an account, you can safely ignore this email.
    </p>
  </div>
  
  <div style="padding: 20px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280;">
    <p>© 2024 {{siteName}}. All rights reserved.</p>
  </div>
</div>`,
      textContent: `Verify Your Email

Hi {{userName}},

Please click the link below to verify your email address:

{{verificationUrl}}

This verification link will expire in {{expirationHours}} hours.

If you didn't create an account, you can safely ignore this email.

© 2024 {{siteName}}. All rights reserved.`,
      variables: ['userName', 'verificationUrl', 'expirationHours', 'siteName'],
      lastUpdated: new Date().toISOString(),
      usageCount: 89
    }
  ])
  
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editingContent, setEditingContent] = useState('')
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html')
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setShowPreview(true)
  }

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setEditingContent(viewMode === 'html' ? template.htmlContent : template.textContent)
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!selectedTemplate) return

    try {
      setLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const updatedTemplate = {
        ...selectedTemplate,
        [viewMode === 'html' ? 'htmlContent' : 'textContent']: editingContent,
        lastUpdated: new Date().toISOString()
      }

      setTemplates(prev => 
        prev.map(t => t.id === selectedTemplate.id ? updatedTemplate : t)
      )

      setMessage({ type: 'success', text: 'Template saved successfully!' })
      setShowEditor(false)
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save template' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail || !selectedTemplate) return

    try {
      setLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage({ type: 'success', text: `Test email sent to ${testEmail}` })
      setTestEmail('')
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test email' })
    } finally {
      setLoading(false)
    }
  }

  const renderPreviewContent = (content: string, variables: string[]) => {
    let rendered = content
    
    // Replace common variables with sample data
    const sampleData = {
      siteName: 'Tightship PMS',
      userName: 'John Smith',
      userEmail: 'john@example.com',
      dashboardUrl: 'https://app.tightship.com/dashboard',
      supportEmail: 'support@tightship.com',
      verificationUrl: 'https://app.tightship.com/verify?token=sample-token',
      resetUrl: 'https://app.tightship.com/reset?token=sample-token',
      expirationHours: '24',
      organizationName: 'Demo Restaurant',
      planName: 'Professional Plan',
      amount: '£29.99'
    }

    variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g')
      rendered = rendered.replace(regex, sampleData[variable] || `[${variable}]`)
    })

    return rendered
  }

  const getTemplateTypeColor = (type: string) => {
    const colors = {
      welcome: 'bg-blue-100 text-blue-800',
      verification: 'bg-green-100 text-green-800',
      password_reset: 'bg-yellow-100 text-yellow-800',
      subscription: 'bg-purple-100 text-purple-800',
      usage_limit: 'bg-orange-100 text-orange-800',
      custom: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || colors.custom
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  return (
    <AdminLayout 
      title="Email Templates" 
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Email Templates' }]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage and customize email templates sent to users
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className={`mb-6 border rounded-md p-4 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400" />
              )}
              <div className="ml-3">
                <p className={`text-sm ${
                  message.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Templates List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
          <ul className="divide-y divide-gray-200">
            {templates.map((template) => (
              <li key={template.id}>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <Mail className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center space-x-3">
                          <p className="text-lg font-medium text-gray-900 truncate">
                            {template.name}
                          </p>
                          <span className={`px-2 py-1 text-xs rounded ${getTemplateTypeColor(template.type)}`}>
                            {template.type.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(template.status)}`}>
                            {template.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Subject: {template.subject}
                        </p>
                        <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                          <span>Used {template.usageCount} times</span>
                          <span>Updated {new Date(template.lastUpdated).toLocaleDateString()}</span>
                          <span>{template.variables.length} variables</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePreview(template)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Preview Modal */}
        {showPreview && selectedTemplate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Preview: {selectedTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Subject: {renderPreviewContent(selectedTemplate.subject, selectedTemplate.variables)}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex border border-gray-300 rounded-md">
                    <button
                      onClick={() => setViewMode('html')}
                      className={`px-3 py-1 text-sm ${
                        viewMode === 'html' 
                          ? 'bg-red-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-50'
                      } rounded-l-md focus:outline-none`}
                    >
                      <Code className="h-4 w-4 mr-1 inline" />
                      HTML
                    </button>
                    <button
                      onClick={() => setViewMode('text')}
                      className={`px-3 py-1 text-sm ${
                        viewMode === 'text' 
                          ? 'bg-red-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-50'
                      } rounded-r-md focus:outline-none`}
                    >
                      <Type className="h-4 w-4 mr-1 inline" />
                      Text
                    </button>
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview Content</h4>
                  <div className="border border-gray-300 rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    {viewMode === 'html' ? (
                      <div 
                        dangerouslySetInnerHTML={{
                          __html: renderPreviewContent(selectedTemplate.htmlContent, selectedTemplate.variables)
                        }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {renderPreviewContent(selectedTemplate.textContent, selectedTemplate.variables)}
                      </pre>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
                  <div className="flex-1">
                    <input
                      type="email"
                      placeholder="Enter email to send test"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <button
                    onClick={handleSendTest}
                    disabled={!testEmail || loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor Modal */}
        {showEditor && selectedTemplate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Edit: {selectedTemplate.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex border border-gray-300 rounded-md">
                    <button
                      onClick={() => {
                        setViewMode('html')
                        setEditingContent(selectedTemplate.htmlContent)
                      }}
                      className={`px-3 py-1 text-sm ${
                        viewMode === 'html' 
                          ? 'bg-red-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-50'
                      } rounded-l-md focus:outline-none`}
                    >
                      HTML
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('text')
                        setEditingContent(selectedTemplate.textContent)
                      }}
                      className={`px-3 py-1 text-sm ${
                        viewMode === 'text' 
                          ? 'bg-red-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-50'
                      } rounded-r-md focus:outline-none`}
                    >
                      Text
                    </button>
                  </div>
                  <button
                    onClick={() => setShowEditor(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {viewMode === 'html' ? 'HTML' : 'Text'} Content
                    </label>
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={20}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Variables
                    </label>
                    <div className="space-y-2">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <code className="text-sm">{'{{' + variable + '}}'}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${variable}}}`)
                              setMessage({ type: 'success', text: 'Variable copied!' })
                              setTimeout(() => setMessage(null), 2000)
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => setEditingContent(prev => prev + '\n\n<p style="color: #6b7280;">{{userName}}</p>')}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded hover:bg-gray-100"
                        >
                          Add User Name
                        </button>
                        <button
                          onClick={() => setEditingContent(prev => prev + '\n\n<a href="{{dashboardUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dashboard</a>')}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded hover:bg-gray-100"
                        >
                          Add Dashboard Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
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
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}