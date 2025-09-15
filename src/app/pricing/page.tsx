'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface SubscriptionPlan {
  id: string
  tier: string
  name: string
  description: string
  priceMonthly: number | null
  priceYearly: number | null
  features: Record<string, boolean>
  limits: Record<string, number>
  isActive: boolean
}

export default function PricingPage() {
  const { data: session } = useSession()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription-plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      } else {
        toast.error('Failed to load pricing plans')
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
      toast.error('Failed to load pricing plans')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      toast.error('Please sign in to subscribe')
      return
    }

    setCheckoutLoading(planId)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
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
      setCheckoutLoading(null)
    }
  }

  const formatPrice = (price: number | null, period: string = 'month') => {
    if (price === null) return 'Custom'
    if (price === 0) return 'Free'
    return `£${price.toFixed(0)}/${period}`
  }

  const formatLimit = (value: number) => {
    if (value === -1) return 'Unlimited'
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
    return value.toString()
  }

  const getFeatureIcon = (enabled: boolean) => {
    return enabled ? (
      <Check className="w-4 h-4 text-green-500" />
    ) : (
      <X className="w-4 h-4 text-red-500" />
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Start with our free plan and upgrade as you grow. All plans include our core menu management features.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.tier === 'PROFESSIONAL' ? 'border-blue-500 shadow-lg' : 'border-gray-200'}`}>
            {plan.tier === 'PROFESSIONAL' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">Most Popular</Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                {plan.name}
              </CardTitle>
              <CardDescription className="text-sm min-h-[40px]">
                {plan.description}
              </CardDescription>
              <div className="mt-4">
                <div className="text-3xl font-bold">
                  {formatPrice(plan.priceMonthly)}
                </div>
                {plan.priceMonthly && (
                  <div className="text-sm text-gray-500 mt-1">
                    {formatPrice(plan.priceYearly, 'year')} billed yearly
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Limits */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Restaurants</span>
                  <span className="font-medium">{formatLimit(plan.limits.restaurants)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Products</span>
                  <span className="font-medium">{formatLimit(plan.limits.products)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>API Calls/month</span>
                  <span className="font-medium">{formatLimit(plan.limits.apiCalls)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Team Members</span>
                  <span className="font-medium">{formatLimit(plan.limits.users)}</span>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Features */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Menu Management</span>
                  {getFeatureIcon(plan.features.menuManagement)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Platform Sync</span>
                  {getFeatureIcon(plan.features.basicSync)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Analytics</span>
                  {getFeatureIcon(plan.features.analytics)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Bulk Operations</span>
                  {getFeatureIcon(plan.features.bulkOperations)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>API Webhooks</span>
                  {getFeatureIcon(plan.features.apiWebhooks)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Priority Support</span>
                  {getFeatureIcon(plan.features.prioritySupport)}
                </div>
              </div>

              <div className="pt-4">
                {plan.tier === 'FREE' ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled={session ? true : false}
                  >
                    {session ? 'Current Plan' : 'Sign Up Free'}
                  </Button>
                ) : plan.tier === 'ENTERPRISE' ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.location.href = 'mailto:sales@tightshippms.com'}
                  >
                    Contact Sales
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={checkoutLoading === plan.id}
                  >
                    {checkoutLoading === plan.id ? 'Loading...' : 'Subscribe'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12 text-sm text-gray-500">
        <p>All plans include 14-day free trial • Cancel anytime • No setup fees</p>
        <p className="mt-2">
          Need help choosing? <a href="mailto:support@tightshippms.com" className="text-blue-600 hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  )
}