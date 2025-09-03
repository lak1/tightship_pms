'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CreditCard,
  Crown,
  Check,
  AlertTriangle,
  TrendingUp,
  Users,
  Building2
} from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  features: string[]
  limits: {
    users: number
    restaurants: number
    apiCalls: number
  }
  isCurrent?: boolean
  isPopular?: boolean
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<string>('FREE')
  const [usage, setUsage] = useState({
    users: 1,
    restaurants: 0,
    apiCalls: 0
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Simulate loading
    setTimeout(() => setLoading(false), 1000)
  }, [session, status, router])

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'GBP',
      features: [
        '1 restaurant location',
        '5 menu items',
        'Basic analytics',
        'Email support'
      ],
      limits: {
        users: 1,
        restaurants: 1,
        apiCalls: 100
      },
      isCurrent: currentPlan === 'FREE'
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 9.99,
      currency: 'GBP',
      features: [
        'Up to 3 restaurant locations',
        'Unlimited menu items',
        'Advanced analytics',
        'Priority email support',
        'Basic integrations'
      ],
      limits: {
        users: 5,
        restaurants: 3,
        apiCalls: 1000
      },
      isCurrent: currentPlan === 'STARTER'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 29.99,
      currency: 'GBP',
      features: [
        'Up to 10 restaurant locations',
        'Unlimited menu items',
        'Advanced analytics & reporting',
        'Phone & email support',
        'All integrations',
        'Custom branding',
        'API access'
      ],
      limits: {
        users: 25,
        restaurants: 10,
        apiCalls: 10000
      },
      isPopular: true,
      isCurrent: currentPlan === 'PROFESSIONAL'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99.99,
      currency: 'GBP',
      features: [
        'Unlimited restaurant locations',
        'Unlimited menu items',
        'Enterprise analytics',
        'Dedicated account manager',
        'All integrations',
        'Custom branding',
        'Full API access',
        'SLA guarantee',
        'Custom features'
      ],
      limits: {
        users: 100,
        restaurants: 999,
        apiCalls: 100000
      },
      isCurrent: currentPlan === 'ENTERPRISE'
    }
  ]

  const handleUpgrade = (planId: string) => {
    alert(`Upgrade to ${planId} plan - This would integrate with payment system`)
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
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

        {/* Current Plan Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <CreditCard className="h-8 w-8 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
                  <p className="text-gray-600">You are currently on the <strong>{currentPlan}</strong> plan</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(plans.find(p => p.isCurrent)?.price || 0, 'GBP')}
              </div>
              <div className="text-sm text-gray-500">per month</div>
            </div>
          </div>
        </div>

        {/* Usage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{usage.users}</div>
                <div className="text-sm text-gray-500">
                  of {plans.find(p => p.isCurrent)?.limits.users} users
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{usage.restaurants}</div>
                <div className="text-sm text-gray-500">
                  of {plans.find(p => p.isCurrent)?.limits.restaurants} restaurants
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{usage.apiCalls.toLocaleString()}</div>
                <div className="text-sm text-gray-500">
                  of {plans.find(p => p.isCurrent)?.limits.apiCalls.toLocaleString()} API calls
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-lg border-2 bg-white p-6 ${
                  plan.isCurrent
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : plan.isPopular
                    ? 'border-green-500'
                    : 'border-gray-200'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-3 py-1 text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 text-xs font-medium rounded-full flex items-center">
                      <Crown className="h-3 w-3 mr-1" />
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-xs text-gray-500 mb-4 space-y-1">
                  <div>• {plan.limits.users} users included</div>
                  <div>• {plan.limits.restaurants} restaurants</div>
                  <div>• {plan.limits.apiCalls.toLocaleString()} API calls/month</div>
                </div>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.isCurrent}
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
                    plan.isCurrent
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.isPopular
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } transition-colors`}
                >
                  {plan.isCurrent ? 'Current Plan' : plan.price === 0 ? 'Get Started' : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Demo Interface</h3>
              <p className="mt-2 text-sm text-blue-700">
                This billing page demonstrates the subscription management interface. 
                In a production environment, this would integrate with payment processors 
                like Stripe or PayPal and connect to the backend subscription system we built.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}