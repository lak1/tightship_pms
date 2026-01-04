/**
 * Uber Eats API Type Definitions
 * Documentation: https://developer.uber.com/docs/eats
 */

export interface UberEatsTokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number // 2592000 seconds (30 days)
  scope: string
}

export interface UberEatsError {
  message: string
  code?: string
}

export interface UberEatsStore {
  id: string
  name: string
  location: {
    address: string
    city: string
    state: string
    postal_code: string
    country: string
    latitude: number
    longitude: number
  }
  contact: {
    phone: string
    email?: string
  }
  status: 'online' | 'offline' | 'paused'
  hours: UberEatsHours[]
  pos_data?: {
    integration_enabled: boolean
    provider: string
  }
}

export interface UberEatsHours {
  day_of_week: number // 0-6 (Sunday-Saturday)
  start_time: string // HH:MM format
  end_time: string // HH:MM format
}

export interface UberEatsMenu {
  menus: UberEatsMenuSection[]
}

export interface UberEatsMenuSection {
  id: string
  title: {
    translations: {
      [languageCode: string]: string
    }
  }
  subtitle?: {
    translations: {
      [languageCode: string]: string
    }
  }
  categories: UberEatsCategory[]
}

export interface UberEatsCategory {
  id: string
  title: {
    translations: {
      [languageCode: string]: string
    }
  }
  subtitle?: {
    translations: {
      [languageCode: string]: string
    }
  }
  entities: string[] // Item IDs
}

export interface UberEatsItem {
  id: string
  external_data?: string
  title: {
    translations: {
      [languageCode: string]: string
    }
  }
  description?: {
    translations: {
      [languageCode: string]: string
    }
  }
  image_url?: string
  price_info: {
    price: number // in cents
    overrides?: Array<{
      context_type: string
      context_value?: string
      price: number
    }>
  }
  quantity_info?: {
    quantity: {
      min_permitted: number
      max_permitted: number
      default_quantity?: number
    }
    overrides?: Array<{
      context_type: string
      context_value?: string
      quantity: {
        min_permitted: number
        max_permitted: number
      }
    }>
  }
  suspension_info?: {
    suspension: {
      suspend_until?: number // Unix timestamp
      reason?: string
    }
  }
  modifier_groups?: UberEatsModifierGroupReference[]
  nutritional_info?: {
    calories?: {
      display_value: string
      energy_value: number
    }
    kilojoules?: {
      display_value: string
      energy_value: number
    }
  }
  dish_info?: {
    classifications: {
      alcoholic_items?: number
      can_serve_alone?: number
      dietary_labels?: string[]
    }
  }
  tax_info?: {
    tax_labels?: string[]
  }
}

export interface UberEatsModifierGroupReference {
  id: string
  external_data?: string
}

export interface UberEatsModifierGroup {
  id: string
  external_data?: string
  title: {
    translations: {
      [languageCode: string]: string
    }
  }
  quantity_info: {
    quantity: {
      min_permitted: number
      max_permitted: number
    }
    overrides?: Array<{
      context_type: string
      context_value?: string
      quantity: {
        min_permitted: number
        max_permitted: number
      }
    }>
  }
  modifier_options: string[] // Modifier option IDs
}

export interface UberEatsModifierOption {
  id: string
  external_data?: string
  title: {
    translations: {
      [languageCode: string]: string
    }
  }
  price_info: {
    price: number
    overrides?: Array<{
      context_type: string
      context_value?: string
      price: number
    }>
  }
  quantity_info?: {
    quantity: {
      min_permitted: number
      max_permitted: number
      default_quantity?: number
    }
  }
  tax_info?: {
    tax_labels?: string[]
  }
}

export interface UberEatsOrder {
  id: string
  display_id: string
  external_reference_id?: string
  current_state: 'created' | 'accepted' | 'denied' | 'finished' | 'cancelled'
  type: 'delivery' | 'pickup' | 'dine_in'
  brand: string
  store: {
    id: string
    name: string
    external_reference_id?: string
  }
  eater: {
    first_name: string
    phone: string
    phone_code: string
  }
  cart: {
    items: UberEatsOrderItem[]
    special_instructions?: string
  }
  payment: {
    charges: {
      total: {
        amount: number
      }
      sub_total: {
        amount: number
      }
      tax: {
        amount: number
      }
      total_fee: {
        amount: number
      }
    }
  }
  placed_at: string // ISO 8601
  estimated_ready_for_pickup_at?: string
}

export interface UberEatsOrderItem {
  id: string
  instance_id: string
  title: string
  external_data?: string
  quantity: number
  price: {
    unit_price: {
      amount: number
    }
    total_price: {
      amount: number
    }
  }
  selected_modifier_groups?: UberEatsSelectedModifierGroup[]
  special_instructions?: string
}

export interface UberEatsSelectedModifierGroup {
  id: string
  title: string
  external_data?: string
  selected_items: Array<{
    id: string
    title: string
    external_data?: string
    quantity: number
    price: {
      unit_price: {
        amount: number
      }
      total_price: {
        amount: number
      }
    }
  }>
}

// Webhook payloads
export interface UberEatsWebhookPayload {
  event_id: string
  event_time: number // Unix timestamp
  event_type: string
  meta: {
    user_id: string
    resource_id: string
  }
  resource_href: string
}

export interface UberEatsMenuRefreshRequest extends UberEatsWebhookPayload {
  event_type: 'store.menu_refresh_request'
}

export interface UberEatsOrderNotification extends UberEatsWebhookPayload {
  event_type: 'orders.notification'
}

// Connection/Integration tracking
export interface UberEatsConnection {
  id: string
  restaurantId: string
  uberEatsStoreId: string
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scopes: string
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface UberEatsSyncLog {
  id: string
  restaurantId: string
  action: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  requestData?: unknown
  responseData?: unknown
  errorMessage?: string
  createdAt: Date
}
