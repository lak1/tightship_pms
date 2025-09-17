import { TRPCClientError } from '@trpc/client'

export interface SubscriptionError {
  code: string
  message: string
  currentUsage?: number
  limit?: number
  upgradeUrl?: string
}

export function parseSubscriptionError(error: any): SubscriptionError | null {
  // Handle tRPC client errors
  if (error instanceof TRPCClientError) {
    const { code, message, data } = error
    
    if (code === 'FORBIDDEN' && data?.cause) {
      return {
        code,
        message,
        currentUsage: data.cause.currentUsage,
        limit: data.cause.limit,
        upgradeUrl: data.cause.upgradeUrl || '/billing'
      }
    }
  }
  
  // Handle other error types
  if (error?.code === 'FORBIDDEN' && error?.cause) {
    return {
      code: error.code,
      message: error.message || 'Subscription limit exceeded',
      currentUsage: error.cause.currentUsage,
      limit: error.cause.limit,
      upgradeUrl: error.cause.upgradeUrl || '/billing'
    }
  }
  
  return null
}

export function createSubscriptionErrorDialog(error: SubscriptionError): {
  title: string
  message: string
  primaryAction: {
    label: string
    href: string
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
} {
  const isProductLimit = error.message.includes('products limit')
  const isRestaurantLimit = error.message.includes('restaurants limit')
  const isApiLimit = error.message.includes('apiCalls limit')
  
  let title = 'Subscription Limit Reached'
  let message = error.message
  
  if (isProductLimit) {
    title = 'Product Limit Reached'
    message = `You've reached your plan's product limit${error.limit ? ` of ${error.limit}` : ''}. ${error.currentUsage ? `You currently have ${error.currentUsage} products.` : ''}`
  } else if (isRestaurantLimit) {
    title = 'Restaurant Limit Reached'
    message = `You've reached your plan's restaurant limit${error.limit ? ` of ${error.limit}` : ''}. ${error.currentUsage ? `You currently have ${error.currentUsage} restaurants.` : ''}`
  } else if (isApiLimit) {
    title = 'API Usage Limit Reached'
    message = `You've reached your plan's API usage limit${error.limit ? ` of ${error.limit}` : ''}. ${error.currentUsage ? `You've made ${error.currentUsage} API calls this month.` : ''}`
  }
  
  return {
    title,
    message: message + ' Upgrade your plan to continue adding items.',
    primaryAction: {
      label: 'Upgrade Plan',
      href: error.upgradeUrl || '/billing'
    },
    secondaryAction: {
      label: 'Cancel',
      onClick: () => {} // Will be handled by the dialog component
    }
  }
}

// Custom hook for handling subscription errors
export function useSubscriptionErrorHandler() {
  const handleSubscriptionError = (error: any, fallbackMessage = 'Something went wrong. Please try again.') => {
    const subscriptionError = parseSubscriptionError(error)
    
    if (subscriptionError) {
      const dialog = createSubscriptionErrorDialog(subscriptionError)
      
      // Create and show a nice modal dialog
      const shouldUpgrade = confirm(
        `${dialog.title}\n\n${dialog.message}\n\nClick OK to go to billing, or Cancel to dismiss.`
      )
      
      if (shouldUpgrade) {
        window.location.href = dialog.primaryAction.href
      }
      
      return true // Indicates we handled a subscription error
    } else {
      // Handle generic errors
      alert(fallbackMessage)
      console.error('Error:', error)
      return false // Indicates this was not a subscription error
    }
  }
  
  return { handleSubscriptionError }
}