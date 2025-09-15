'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SubscriptionStatus } from '@/components/billing/subscription-status'
import { PlanComparison } from '@/components/billing/plan-comparison'
import { toast } from 'sonner'

interface SubscriptionData {
  id: string
  plan: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  subscriptionPlan: {
    id: string
    name: string
    tier: string
    description: string
    priceMonthly: number | null
    priceYearly: number | null
    features: Record<string, boolean>
    limits: Record<string, number>
  } | null
}

interface Usage {
  apiCalls: number
  restaurants: number
  products: number
}

interface Plan {
  id: string
  tier: string
  name: string
  description: string
  priceMonthly: number | null
  priceYearly: number | null
  features: Record<string, any>
  limits: {
    restaurants: number
    products: number
    apiCalls: number
  }
  isActive: boolean
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [showPlans, setShowPlans] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      const [subscriptionRes, usageRes, plansRes] = await Promise.all([
        fetch('/api/subscription'),
        fetch('/api/subscription/usage'),
        fetch('/api/subscription-plans')
      ])

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json()
        setSubscription(subscriptionData)
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsage(usageData)
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(plansData.map((plan: any) => ({
          ...plan,
          isCurrent: subscription?.subscriptionPlan?.id === plan.id || (subscription?.plan === plan.tier),
          isUpgrade: subscription ? plan.priceMonthly > (subscription.subscriptionPlan?.priceMonthly || 0) : true,
          isDowngrade: subscription ? plan.priceMonthly < (subscription.subscriptionPlan?.priceMonthly || 0) : false,
          isPopular: plan.tier === 'PROFESSIONAL'
        })))
      }
    } catch (error) {
      console.error('Error fetching billing data:', error)
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = () => {
    setShowPlans(!showPlans)
  }

  const handleSelectPlan = async (planId: string) => {
    if (!session) {
      toast.error('Please sign in to subscribe')
      return
    }

    setUpgradeLoading(true)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/billing?checkout=success`,
          cancelUrl: `${window.location.origin}/billing?checkout=cancelled`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionUrl } = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = sessionUrl
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout process')
      setUpgradeLoading(false)
    }
  }

  const handleManageBilling = async () => {
    if (!subscription?.stripeCustomerId) {
      toast.error('No billing account found')
      return
    }

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
    }
  }

  // Transform subscription data for the component
  const transformedSubscription = subscription ? {
    plan: {
      name: subscription.subscriptionPlan?.name || subscription.plan,
      tier: subscription.subscriptionPlan?.tier || subscription.plan,
      description: subscription.subscriptionPlan?.description || 'Your current subscription plan'
    },
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    isActive: ['ACTIVE', 'TRIALING'].includes(subscription.status),
    isExpired: subscription.status === 'CANCELLED' || subscription.status === 'INCOMPLETE',
    daysUntilExpiry: subscription.currentPeriodEnd ? 
      Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
  } : null

  // Transform usage data for the component
  const transformedUsage = subscription?.subscriptionPlan && usage ? {
    restaurants: { 
      currentUsage: usage.restaurants, 
      limit: subscription.subscriptionPlan.limits.restaurants 
    },
    products: { 
      currentUsage: usage.products, 
      limit: subscription.subscriptionPlan.limits.products 
    },
    apiCalls: { 
      currentUsage: usage.apiCalls, 
      limit: subscription.subscriptionPlan.limits.apiCalls 
    }
  } : undefined

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage your subscription and billing settings
          </p>
        </div>

        {/* Main Content */}
        {transformedSubscription ? (
          <div className="space-y-8">
            <SubscriptionStatus
              subscription={transformedSubscription}
              usageStats={transformedUsage}
              onUpgrade={handleUpgrade}
              onManageBilling={subscription.stripeCustomerId ? handleManageBilling : undefined}
            />

            {/* Plan Comparison (shown when upgrading) */}
            {showPlans && plans.length > 0 && (
              <div className="space-y-6">
                <div className="border-t pt-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
                  <PlanComparison
                    plans={plans}
                    currentPlanId={subscription.subscriptionPlan?.id}
                    onSelectPlan={handleSelectPlan}
                    disabled={upgradeLoading}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          // No subscription state - show welcome
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Tightship PMS!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Choose a plan to get started with our restaurant management platform
              </p>
              
              {usage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                  <h3 className="font-semibold text-blue-900 mb-4">Your Current Usage</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900">{usage.restaurants}</div>
                      <div className="text-sm text-blue-700">Restaurants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900">{usage.products}</div>
                      <div className="text-sm text-blue-700">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900">{usage.apiCalls}</div>
                      <div className="text-sm text-blue-700">API Calls</div>
                    </div>
                  </div>
                </div>
              )}

              {plans.length > 0 && (
                <PlanComparison
                  plans={plans}
                  onSelectPlan={handleSelectPlan}
                  disabled={upgradeLoading}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}