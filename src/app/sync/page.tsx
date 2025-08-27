'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Play, Settings } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'

const PLATFORMS = [
  { name: 'Deliveroo', status: 'connected', lastSync: '2 hours ago', color: 'bg-green-100 text-green-800' },
  { name: 'Uber Eats', status: 'connected', lastSync: '4 hours ago', color: 'bg-green-100 text-green-800' },
  { name: 'Just Eat', status: 'error', lastSync: '2 days ago', color: 'bg-red-100 text-red-800' },
  { name: 'DoorDash', status: 'disconnected', lastSync: 'Never', color: 'bg-gray-100 text-gray-800' },
]

const SYNC_HISTORY = [
  {
    id: 1,
    platform: 'Deliveroo',
    restaurant: 'Downtown Burgers',
    status: 'completed',
    productsUpdated: 24,
    timestamp: '2024-01-20 14:30:00',
    duration: '2.3s'
  },
  {
    id: 2,
    platform: 'Uber Eats',
    restaurant: 'Pizza Palace',
    status: 'completed',
    productsUpdated: 18,
    timestamp: '2024-01-20 12:15:00',
    duration: '1.8s'
  },
  {
    id: 3,
    platform: 'Just Eat',
    restaurant: 'Downtown Burgers',
    status: 'failed',
    productsUpdated: 0,
    timestamp: '2024-01-19 16:45:00',
    duration: '0.5s',
    error: 'Authentication failed'
  },
]

export default function SyncPage() {
  const { data: session, status } = useSession()
  const [isRunningSync, setIsRunningSync] = useState(false)
  
  const { data: restaurants } = trpc.restaurant.list.useQuery(
    undefined,
    { enabled: !!session }
  )

  const handleRunSync = async () => {
    setIsRunningSync(true)
    // Simulate sync process
    setTimeout(() => {
      setIsRunningSync(false)
    }, 3000)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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

  return (
    <DashboardLayout
      title="Sync Status"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Sync Status' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Monitor and manage price synchronization across delivery platforms
          </p>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Settings className="mr-2 h-4 w-4" />
              Sync Settings
            </button>
            <button
              onClick={handleRunSync}
              disabled={isRunningSync}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunningSync ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Sync Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Platform Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {PLATFORMS.map((platform) => (
            <div key={platform.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {platform.name}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${platform.color}`}>
                        {platform.status === 'connected' && <CheckCircle className="mr-1 h-3 w-3" />}
                        {platform.status === 'error' && <XCircle className="mr-1 h-3 w-3" />}
                        {platform.status === 'disconnected' && <AlertCircle className="mr-1 h-3 w-3" />}
                        {platform.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Last sync: {platform.lastSync}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sync History */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Sync Activity</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Restaurant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {SYNC_HISTORY.map((sync) => (
                      <tr key={sync.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {sync.platform}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{sync.restaurant}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sync.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {sync.status === 'completed' ? (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            ) : (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {sync.status}
                          </span>
                          {sync.error && (
                            <div className="text-xs text-red-600 mt-1">{sync.error}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{sync.productsUpdated}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(sync.timestamp).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Duration: {sync.duration}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Auto Sync Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Auto Sync</div>
                    <div className="text-xs text-gray-500">Automatically sync prices</div>
                  </div>
                  <button
                    type="button"
                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-green-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    role="switch"
                    aria-checked="true"
                  >
                    <span className="translate-x-5 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
                      <CheckCircle className="absolute inset-0 h-full w-full text-green-600 opacity-100 transition-opacity duration-200 ease-in" />
                    </span>
                  </button>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Sync Frequency
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option>Every 15 minutes</option>
                    <option>Every 30 minutes</option>
                    <option>Every hour</option>
                    <option>Every 4 hours</option>
                    <option>Daily</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Sync Window
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      defaultValue="08:00"
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <input
                      type="time"
                      defaultValue="22:00"
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Only sync during these hours
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Next Scheduled Sync</h3>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    In 12 minutes
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(Date.now() + 12 * 60 * 1000).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Today&apos;s syncs</span>
                  <span className="text-sm font-medium text-gray-900">24</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Success rate</span>
                  <span className="text-sm font-medium text-green-600">98.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Products synced</span>
                  <span className="text-sm font-medium text-gray-900">1,247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last failure</span>
                  <span className="text-sm font-medium text-red-600">2 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}