'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionStatusProps {
  subscription: {
    plan: {
      name: string;
      tier: string;
      description?: string;
    };
    status: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    isActive: boolean;
    isExpired: boolean;
    daysUntilExpiry?: number | null;
  };
  usageStats?: {
    restaurants: { currentUsage: number; limit: number };
    products: { currentUsage: number; limit: number };
    apiCalls: { currentUsage: number; limit: number };
  };
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  onCancelSubscription?: () => void;
  onReactivateSubscription?: () => void;
}

export function SubscriptionStatus({
  subscription,
  usageStats,
  onUpgrade,
  onManageBilling,
  onCancelSubscription,
  onReactivateSubscription
}: SubscriptionStatusProps) {
  const getStatusBadge = () => {
    const { status, isActive, isExpired, cancelAtPeriodEnd } = subscription;

    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive" className="gap-1">
        <Clock className="h-3 w-3" />
        Cancelling
      </Badge>;
    }

    if (isExpired) {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expired
      </Badge>;
    }

    if (status === 'TRIALING') {
      return <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Trial
      </Badge>;
    }

    if (isActive) {
      return <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>;
    }

    return <Badge variant="outline">{status}</Badge>;
  };

  const getUsagePercentage = (current: number | undefined, limit: number | undefined) => {
    if (!current || !limit || limit === -1) return 0; // Unlimited or undefined
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 95) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan: {subscription.plan.name}
              </CardTitle>
              <CardDescription>
                {subscription.plan.description}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Information */}
            {subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {subscription.cancelAtPeriodEnd ? 'Ends on:' : 'Renews on:'}
                </span>
                <span className="font-medium">
                  {format(new Date(subscription.currentPeriodEnd), 'PPP')}
                </span>
              </div>
            )}

            {subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry <= 7 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {subscription.daysUntilExpiry > 0 
                    ? `Your subscription expires in ${subscription.daysUntilExpiry} days`
                    : 'Your subscription has expired'
                  }
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {subscription.plan.tier !== 'ENTERPRISE' && (
                <Button onClick={onUpgrade} variant="default">
                  Upgrade Plan
                </Button>
              )}
              
              {onManageBilling && (
                <Button onClick={onManageBilling} variant="outline">
                  Manage Billing
                </Button>
              )}

              {subscription.cancelAtPeriodEnd && onReactivateSubscription ? (
                <Button onClick={onReactivateSubscription} variant="outline">
                  Reactivate Subscription
                </Button>
              ) : (
                subscription.isActive && onCancelSubscription && (
                  <Button onClick={onCancelSubscription} variant="ghost" className="text-red-600 hover:text-red-700">
                    Cancel Subscription
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>
              Track your usage against your plan limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Restaurants */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Restaurants</span>
                  <span className="text-muted-foreground">
                    {usageStats.restaurants.currentUsage ?? 0} / {
                      (!usageStats.restaurants.limit || usageStats.restaurants.limit === -1)
                        ? 'Unlimited' 
                        : usageStats.restaurants.limit
                    }
                  </span>
                </div>
                {usageStats.restaurants.limit && usageStats.restaurants.limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(usageStats.restaurants.currentUsage, usageStats.restaurants.limit)}
                    className="h-2"
                  />
                )}
              </div>

              {/* Products */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Products</span>
                  <span className="text-muted-foreground">
                    {usageStats.products.currentUsage ?? 0} / {
                      (!usageStats.products.limit || usageStats.products.limit === -1)
                        ? 'Unlimited' 
                        : usageStats.products.limit
                    }
                  </span>
                </div>
                {usageStats.products.limit && usageStats.products.limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(usageStats.products.currentUsage, usageStats.products.limit)}
                    className="h-2"
                  />
                )}
              </div>

              {/* API Calls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">API Calls</span>
                  <span className="text-muted-foreground">
                    {(usageStats.apiCalls.currentUsage ?? 0).toLocaleString()} / {
                      (!usageStats.apiCalls.limit || usageStats.apiCalls.limit === -1)
                        ? 'Unlimited' 
                        : usageStats.apiCalls.limit.toLocaleString()
                    }
                  </span>
                </div>
                {usageStats.apiCalls.limit && usageStats.apiCalls.limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(usageStats.apiCalls.currentUsage, usageStats.apiCalls.limit)}
                    className="h-2"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}