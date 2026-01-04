/**
 * Deliveroo Partner API Type Definitions
 * Based on standard delivery platform API patterns
 */

export interface DeliverooTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface DeliverooError {
  error: string
  error_description?: string
  error_code?: string
}

export interface DeliverooRestaurant {
  id: string
  name: string
  address: {
    line1: string
    line2?: string
    city: string
    postcode: string
    country: string
  }
  location: {
    latitude: number
    longitude: number
  }
  phone: string
  email?: string
  timezone: string
  currency: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface DeliverooMenu {
  id: string
  restaurant_id: string
  name: string
  description?: string
  active: boolean
  categories: DeliverooCategory[]
  created_at: string
  updated_at: string
}

export interface DeliverooCategory {
  id: string
  name: string
  description?: string
  display_order: number
  active: boolean
  items: DeliverooMenuItem[]
  availability?: DeliverooAvailability
}

export interface DeliverooMenuItem {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  display_order: number
  active: boolean
  availability?: DeliverooAvailability
  modifier_groups?: DeliverooModifierGroup[]
  dietary_info?: {
    vegetarian?: boolean
    vegan?: boolean
    gluten_free?: boolean
    dairy_free?: boolean
    nut_free?: boolean
    allergens?: string[]
  }
  nutrition_info?: {
    calories?: number
    protein?: number
    carbohydrates?: number
    fat?: number
  }
  metadata?: Record<string, unknown>
}

export interface DeliverooModifierGroup {
  id: string
  name: string
  min_selection: number
  max_selection: number
  required: boolean
  modifiers: DeliverooModifier[]
  display_order: number
}

export interface DeliverooModifier {
  id: string
  name: string
  price: number
  default_selected?: boolean
  active: boolean
  display_order: number
}

export interface DeliverooAvailability {
  type: 'always' | 'schedule' | 'out_of_stock'
  schedule?: {
    monday?: DeliverooTimeSlot[]
    tuesday?: DeliverooTimeSlot[]
    wednesday?: DeliverooTimeSlot[]
    thursday?: DeliverooTimeSlot[]
    friday?: DeliverooTimeSlot[]
    saturday?: DeliverooTimeSlot[]
    sunday?: DeliverooTimeSlot[]
  }
}

export interface DeliverooTimeSlot {
  start: string // HH:MM format
  end: string // HH:MM format
}

export interface DeliverooMenuUpdate {
  name?: string
  description?: string
  active?: boolean
  categories?: DeliverooCategory[]
}

export interface DeliverooItemUpdate {
  name?: string
  description?: string
  price?: number
  image_url?: string
  active?: boolean
  availability?: DeliverooAvailability
  modifier_groups?: DeliverooModifierGroup[]
}

export interface DeliverooOrder {
  id: string
  restaurant_id: string
  customer: {
    name: string
    phone?: string
  }
  items: DeliverooOrderItem[]
  total_amount: number
  delivery_fee: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  delivery_time: string
  created_at: string
  updated_at: string
}

export interface DeliverooOrderItem {
  id: string
  item_id: string
  name: string
  quantity: number
  price: number
  modifiers?: {
    id: string
    name: string
    price: number
  }[]
  special_instructions?: string
}

export interface DeliverooWebhookPayload {
  event_type: 'order.created' | 'order.updated' | 'menu.updated'
  event_id: string
  timestamp: string
  data: unknown
}

export interface DeliverooConnection {
  id: string
  restaurantId: string
  deliverooRestaurantId: string
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scopes: string
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface DeliverooSyncLog {
  id: string
  restaurantId: string
  action: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  requestData?: unknown
  responseData?: unknown
  errorMessage?: string
  createdAt: Date
}

export interface DeliverooMenuMapping {
  id: string
  ourMenuId: string
  deliverooMenuId: string
  lastSyncedAt: Date
}

export interface DeliverooItemMapping {
  id: string
  ourItemId: string
  deliverooItemId: string
  lastSyncedAt: Date
  syncDirection: 'TO_DELIVEROO' | 'FROM_DELIVEROO' | 'BIDIRECTIONAL'
}

// Pagination
export interface DeliverooPaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
  links: {
    first?: string
    prev?: string
    next?: string
    last?: string
  }
}

// Image upload
export interface DeliverooImageUploadResponse {
  url: string
  id: string
}
