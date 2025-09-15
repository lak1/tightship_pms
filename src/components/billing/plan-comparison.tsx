'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building, Rocket } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PlanFeature {
  name: string;
  included: boolean;
  description?: string;
}

interface Plan {
  id: string;
  tier: string;
  name: string;
  description: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  features: Record<string, any>;
  limits: {
    restaurants: number;
    products: number;
    apiCalls: number;
    menus: number;
  };
  integrations: {
    basicApi: boolean;
    eposIntegration: boolean;
    deliveryPlatforms: boolean;
  };
  isCurrent?: boolean;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  isPopular?: boolean;
}

interface PlanComparisonProps {
  plans: Plan[];
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  disabled?: boolean;
  showYearly?: boolean;
}

export function PlanComparison({
  plans,
  currentPlanId,
  onSelectPlan,
  disabled = false,
  showYearly = false
}: PlanComparisonProps) {
  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'FREE':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'SINGLE':
        return <Building className="h-5 w-5 text-green-500" />;
      case 'MULTI':
        return <Crown className="h-5 w-5 text-teal-500" />;
      case 'GROWING':
        return <Rocket className="h-5 w-5 text-purple-500" />;
      case 'ENTERPRISE':
        return <Crown className="h-5 w-5 text-orange-500" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Unlimited';
    return limit.toLocaleString();
  };

  const getPrice = (plan: Plan) => {
    const price = showYearly ? plan.priceYearly : plan.priceMonthly;
    if (price === null || price === 0) return 'Free';
    return formatCurrency(price);
  };

  const getPricePeriod = () => showYearly ? 'year' : 'month';

  const getButtonVariant = (plan: Plan) => {
    if (plan.isCurrent) return 'outline';
    if (plan.isUpgrade || plan.tier === 'MULTI') return 'default';
    return 'outline';
  };

  const getButtonText = (plan: Plan) => {
    if (plan.isCurrent) return 'Current Plan';
    if (plan.isUpgrade) return 'Upgrade';
    if (plan.isDowngrade) return 'Downgrade';
    return 'Select Plan';
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`relative ${
            plan.tier === 'MULTI' ? 'ring-2 ring-teal-500 shadow-lg' : ''
          }`}
        >
          {plan.tier === 'MULTI' && (
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-teal-500">
              Most Popular
            </Badge>
          )}
          
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2">
              {getPlanIcon(plan.tier)}
              <CardTitle>{plan.name}</CardTitle>
            </div>
            <CardDescription>{plan.description}</CardDescription>
            
            {/* Pricing */}
            <div className="py-4">
              <div className="text-3xl font-bold">
                {getPrice(plan)}
                {plan.priceMonthly !== null && plan.priceMonthly > 0 && (
                  <span className="text-base font-normal text-muted-foreground">
                    /{getPricePeriod()}
                  </span>
                )}
              </div>
              
              {showYearly && plan.priceMonthly && plan.priceYearly && plan.priceYearly > 0 && (
                <div className="text-sm text-muted-foreground">
                  Save {Math.round((1 - (plan.priceYearly / 12) / plan.priceMonthly) * 100)}% annually
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Limits */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Restaurant Locations</span>
                <span className="font-medium">{formatLimit(plan.limits.restaurants)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Menu Items</span>
                <span className="font-medium">{formatLimit(plan.limits.products)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Menus per Location</span>
                <span className="font-medium">{formatLimit(plan.limits.menus)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>API Calls/month</span>
                <span className="font-medium">{formatLimit(plan.limits.apiCalls)}</span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Features:</h4>
              <div className="space-y-1">
                {Object.entries(plan.features).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {value ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300" />
                    )}
                    <span className={value ? '' : 'text-gray-400'}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Integrations */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Integrations:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  {plan.integrations.basicApi ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={plan.integrations.basicApi ? '' : 'text-gray-400'}>
                    Website API
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {plan.integrations.eposIntegration ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={plan.integrations.eposIntegration ? '' : 'text-gray-400'}>
                    EPOS Integration
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {plan.integrations.deliveryPlatforms ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={plan.integrations.deliveryPlatforms ? '' : 'text-gray-400'}>
                    Delivery Platforms
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button
              className="w-full"
              variant={getButtonVariant(plan)}
              onClick={() => onSelectPlan(plan.id)}
              disabled={disabled || plan.isCurrent}
            >
              {getButtonText(plan)}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}