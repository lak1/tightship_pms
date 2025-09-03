'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/admin-layout'
import { 
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Building2,
  CreditCard,
  DollarSign,
  Filter,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  Eye
} from 'lucide-react'

interface ReportData {
  type: string
  dateRange: { startDate: string; endDate: string }
  generatedAt: string
  data: any
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('overview')
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateReport()
  }, [reportType, dateFrom, dateTo])

  const generateReport = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        type: reportType,
        dateFrom,
        dateTo,
        format: 'json'
      })

      const response = await fetch(`/api/admin/reports?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const result = await response.json()
      setReportData(result.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        type: reportType,
        dateFrom,
        dateTo,
        format
      })

      const response = await fetch(`/api/admin/reports?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      if (format === 'csv') {
        const csvData = await response.text()
        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        const jsonData = await response.json()
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const reportTypes = [
    { value: 'overview', label: 'System Overview', icon: BarChart3 },
    { value: 'users', label: 'Users Report', icon: Users },
    { value: 'organizations', label: 'Organizations Report', icon: Building2 },
    { value: 'subscriptions', label: 'Subscriptions Report', icon: CreditCard },
    { value: 'revenue', label: 'Revenue Report', icon: DollarSign },
    { value: 'growth', label: 'Growth Analytics', icon: TrendingUp },
  ]

  const renderOverviewReport = () => {
    if (!reportData?.data?.summary) return null

    const { summary, metrics } = reportData.data

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.totalUsers}</p>
                <p className="text-sm text-green-600">+{summary.newUsersInPeriod} this period</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Organizations</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.totalOrganizations}</p>
                <p className="text-sm text-green-600">+{summary.newOrganizationsInPeriod} this period</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.activeSubscriptions}</p>
                <p className="text-sm text-gray-600">{metrics.subscriptionConversionRate}% conversion</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">£{summary.totalRevenue}</p>
                <p className="text-sm text-gray-600">£{summary.averageRevenuePerUser} ARPU</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Growth Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{metrics.userGrowthRate}%</p>
              <p className="text-sm text-gray-500">User Growth Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{metrics.organizationGrowthRate}%</p>
              <p className="text-sm text-gray-500">Organization Growth Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{metrics.subscriptionConversionRate}%</p>
              <p className="text-sm text-gray-500">Subscription Conversion Rate</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDataTable = (data: any[], title: string) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">No data available for the selected period</p>
        </div>
      )
    }

    const headers = Object.keys(data[0])

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.slice(0, 10).map((row, index) => (
                <tr key={index}>
                  {headers.map((header) => (
                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof row[header] === 'boolean' 
                        ? row[header] ? 'Yes' : 'No'
                        : row[header] || 'N/A'
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 10 && (
            <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500">
              Showing 10 of {data.length} records. Export for full data.
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderReportContent = () => {
    if (!reportData) return null

    switch (reportType) {
      case 'overview':
        return renderOverviewReport()
      case 'users':
        return (
          <div className="space-y-6">
            {reportData.data.statistics && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">User Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{reportData.data.statistics.total}</p>
                    <p className="text-sm text-gray-500">Total Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {reportData.data.statistics.roleBreakdown?.find(r => r.role === 'OWNER')?._count || 0}
                    </p>
                    <p className="text-sm text-gray-500">Owners</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {reportData.data.statistics.statusBreakdown?.find(s => s.isActive === true)?._count || 0}
                    </p>
                    <p className="text-sm text-gray-500">Active Users</p>
                  </div>
                </div>
              </div>
            )}
            {renderDataTable(reportData.data.users, 'User Details')}
          </div>
        )
      case 'organizations':
        return (
          <div className="space-y-6">
            {reportData.data.statistics && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{reportData.data.statistics.total}</p>
                    <p className="text-sm text-gray-500">Total Organizations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">£{reportData.data.statistics.totalRevenue}</p>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{reportData.data.statistics.averageUsersPerOrg}</p>
                    <p className="text-sm text-gray-500">Avg Users per Org</p>
                  </div>
                </div>
              </div>
            )}
            {renderDataTable(reportData.data.organizations, 'Organization Details')}
          </div>
        )
      case 'subscriptions':
        return (
          <div className="space-y-6">
            {reportData.data.statistics && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{reportData.data.statistics.total}</p>
                    <p className="text-sm text-gray-500">Total Subscriptions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">£{reportData.data.statistics.totalRevenue}</p>
                    <p className="text-sm text-gray-500">Active Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {reportData.data.statistics.planBreakdown?.length || 0}
                    </p>
                    <p className="text-sm text-gray-500">Plan Types</p>
                  </div>
                </div>
              </div>
            )}
            {renderDataTable(reportData.data.subscriptions, 'Subscription Details')}
          </div>
        )
      case 'revenue':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    £{reportData.data.summary?.monthlyRecurringRevenue || 0}
                  </p>
                  <p className="text-sm text-gray-500">Monthly Recurring Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    £{reportData.data.summary?.annualRecurringRevenue || 0}
                  </p>
                  <p className="text-sm text-gray-500">Annual Recurring Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    £{reportData.data.summary?.averageRevenuePerUser || 0}
                  </p>
                  <p className="text-sm text-gray-500">Average Revenue Per User</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {reportData.data.summary?.totalActiveSubscriptions || 0}
                  </p>
                  <p className="text-sm text-gray-500">Active Subscriptions</p>
                </div>
              </div>
            </div>
            {reportData.data.breakdown?.byPlan && renderDataTable(reportData.data.breakdown.byPlan, 'Revenue by Plan')}
          </div>
        )
      case 'growth':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Growth Analytics</h3>
              <p className="text-sm text-gray-600 mb-4">
                Showing {reportData.data.interval}ly growth data for the selected period
              </p>
              <div className="space-y-4">
                {reportData.data.growth?.users && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">User Growth</h4>
                    {renderDataTable(reportData.data.growth.users, 'User Growth Data')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      default:
        return <div>Report type not implemented</div>
    }
  }

  return (
    <AdminLayout 
      title="Reports & Analytics" 
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Reports' }]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="mt-2 text-sm text-gray-700">
              Generate and export comprehensive reports
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => exportReport('csv')}
              disabled={!reportData || loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => exportReport('json')}
              disabled={!reportData || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-2 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Generating report...</p>
          </div>
        )}

        {/* Report content */}
        {!loading && reportData && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {reportTypes.find(t => t.value === reportType)?.label}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Generated on {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Period: {new Date(reportData.dateRange.startDate).toLocaleDateString()} - {new Date(reportData.dateRange.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>{Math.ceil((new Date(reportData.dateRange.endDate).getTime() - new Date(reportData.dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                </div>
              </div>
            </div>

            {renderReportContent()}
          </div>
        )}

        {!loading && !reportData && !error && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Select a report type and date range to generate a report</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}