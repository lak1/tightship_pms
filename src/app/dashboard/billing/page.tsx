'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreditCard, TrendingUp, Users, Building, Package } from 'lucide-react'
import { toast } from 'sonner'

interface Subscription {
  id: string
  plan: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  subscriptionPlan: {
    name: string
    description: string
    priceMonthly: number | null
    features: Record<string, boolean>
    limits: Record<string, number>
  } | null
}

interface Usage {
  apiCalls: number
  restaurants: number
  products: number
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBillingData()
    }
  }, [status])

  const fetchBillingData = async () => {
    try {
      const [subscriptionRes, usageRes] = await Promise.all([
        fetch('/api/subscription'),
        fetch('/api/subscription/usage')
      ])

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json()
        setSubscription(subscriptionData)
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsage(usageData)
      }
    } catch (error) {
      console.error('Error fetching billing data:', error)
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerPortal = async () => {
    if (!subscription?.stripeCustomerId) {
      toast.error('No billing account found')
      return
    }

    setPortalLoading(true)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { sessionUrl } = await response.json()
      window.location.href = sessionUrl
    } catch (error) {
      console.error('Portal error:', error)
      toast.error('Failed to open billing portal')
      setPortalLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatLimit = (value: number) => {
    if (value === -1) return 'Unlimited'
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
    return value.toString()
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      ACTIVE: { label: 'Active', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      TRIALING: { label: 'Trial', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
      PAST_DUE: { label: 'Past Due', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      CANCELLED: { label: 'Cancelled', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' },
      INCOMPLETE: { label: 'Incomplete', variant: 'destructive' as const, color: 'bg-yellow-100 text-yellow-800' },
    }
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.INCOMPLETE
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Subscription Found</CardTitle>
            <CardDescription>
              It looks like you don't have an active subscription yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/pricing'}>
              View Pricing Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and monitor usage</p>
        </div>
        {subscription.stripeCustomerId && (
          <Button 
            onClick={handleCustomerPortal}
            disabled={portalLoading}
            className="flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {portalLoading ? 'Loading...' : 'Manage Billing'}
          </Button>
        )}
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {subscription.subscriptionPlan?.name || subscription.plan} Plan
                {getStatusBadge(subscription.status)}
              </CardTitle>
              <CardDescription>
                {subscription.subscriptionPlan?.description || 'Your current subscription plan'}
              </CardDescription>
            </div>
            {subscription.subscriptionPlan?.priceMonthly && (
              <div className="text-right">
                <div className="text-2xl font-bold">
                  £{subscription.subscriptionPlan.priceMonthly.toFixed(0)}
                </div>
                <div className="text-sm text-gray-500">per month</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription.status === 'TRIALING' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  <strong>Free trial ends:</strong> {formatDate(subscription.currentPeriodEnd)}
                </div>
              </div>
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-800">
                <strong>Subscription will cancel on:</strong> {formatDate(subscription.currentPeriodEnd)}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Current period:</strong><br />
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </div>
            <div>
              <strong>Status:</strong><br />
              {subscription.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      {usage && subscription.subscriptionPlan && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">API Calls</span>
                </div>
                <div className="text-sm text-gray-500">
                  {usage.apiCalls.toLocaleString()} / {formatLimit(subscription.subscriptionPlan.limits.apiCalls)}
                </div>
              </div>
              {subscription.subscriptionPlan.limits.apiCalls !== -1 && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${getUsagePercentage(usage.apiCalls, subscription.subscriptionPlan.limits.apiCalls)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Restaurants</span>
                </div>
                <div className="text-sm text-gray-500">
                  {usage.restaurants} / {formatLimit(subscription.subscriptionPlan.limits.restaurants)}
                </div>
              </div>
              {subscription.subscriptionPlan.limits.restaurants !== -1 && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${getUsagePercentage(usage.restaurants, subscription.subscriptionPlan.limits.restaurants)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Products</span>
                </div>
                <div className="text-sm text-gray-500">
                  {usage.products} / {formatLimit(subscription.subscriptionPlan.limits.products)}
                </div>
              </div>
              {subscription.subscriptionPlan.limits.products !== -1 && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${getUsagePercentage(usage.products, subscription.subscriptionPlan.limits.products)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upgrade Options */}
      {subscription.plan === 'FREE' && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>
              Get more features and higher limits with a paid plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/pricing'}>
              View Upgrade Options
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}