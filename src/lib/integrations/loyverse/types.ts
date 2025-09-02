export interface LoyverseTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface LoyverseError {
  error: string;
  error_description?: string;
}

export interface LoyverseItem {
  id: string;
  item_name: string;
  reference_id?: string;
  category_id?: string;
  description?: string;
  price: number;
  cost?: number;
  sku?: string;
  barcode?: string;
  is_composite: boolean;
  use_production: boolean;
  components?: LoyverseItemComponent[];
  modifiers?: string[];
  taxes?: string[];
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  track_stock: boolean;
  sold_by_weight: boolean;
  is_service: boolean;
  color?: string;
  shape?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoyverseItemComponent {
  item_id: string;
  quantity: number;
}

export interface LoyverseCategory {
  id: string;
  name: string;
  color?: string;
  parent_category_id?: string;
}

export interface LoyverseModifierList {
  id: string;
  name: string;
  type: 'SINGLE' | 'MULTIPLE';
  modifiers: LoyverseModifier[];
}

export interface LoyverseModifier {
  id: string;
  name: string;
  price?: number;
}

export interface LoyverseInventory {
  item_id: string;
  variant_id?: string;
  store_id: string;
  in_stock: number;
  low_stock_level?: number;
}

export interface LoyverseReceipt {
  receipt_number: string;
  receipt_type: 'SALE' | 'REFUND';
  refund_for?: string;
  order?: string;
  created_at: string;
  updated_at?: string;
  note?: string;
  receipt_date?: string;
  total_money: number;
  total_tax?: number;
  points_earned?: number;
  points_deducted?: number;
  points_balance?: number;
  customer_id?: string;
  total_discount?: number;
  employee_id?: string;
  store_id?: string;
  pos_device_id?: string;
  dining_option?: string;
  source?: string;
  line_items: LoyverseLineItem[];
  payments?: LoyversePayment[];
  taxes?: LoyverseTax[];
}

export interface LoyverseLineItem {
  id?: string;
  item_id?: string;
  variant_id?: string;
  item_name: string;
  variant_name?: string;
  sku?: string;
  quantity: number;
  price: number;
  gross_total_money?: number;
  total_money?: number;
  total_discount?: number;
  total_tax?: number;
  cost?: number;
  cost_total?: number;
  line_modifiers?: LoyverseLineModifier[];
  line_note?: string;
  discounts?: LoyverseDiscount[];
  taxes?: LoyverseTax[];
}

export interface LoyverseLineModifier {
  id: string;
  name: string;
  price?: number;
  quantity?: number;
}

export interface LoyversePayment {
  payment_type_id: string;
  payment_type_name?: string;
  money_amount: number;
  paid_at?: string;
}

export interface LoyverseTax {
  id?: string;
  name?: string;
  rate?: number;
  tax_amount?: number;
}

export interface LoyverseDiscount {
  id?: string;
  name?: string;
  discount_amount?: number;
}

export interface LoyverseMerchant {
  id: string;
  name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  currency?: string;
  timezone?: string;
  business_type?: string;
}

export interface LoyverseStore {
  id: string;
  name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  timezone?: string;
}

export interface LoyverseWebhookPayload {
  event_type: 'ORDER_CREATED' | 'ITEM_UPDATED';
  event_id: string;
  created_at: string;
  data: any;
}

export interface LoyverseConnection {
  id: string;
  restaurantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string;
  merchantId?: string;
  storeId?: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyverseItemMapping {
  id: string;
  ourItemId: string;
  loyverseItemId: string;
  loyverseVariantId?: string;
  lastSyncedAt: Date;
  syncDirection: 'TO_LOYVERSE' | 'FROM_LOYVERSE' | 'BIDIRECTIONAL';
}

export interface LoyverseSyncLog {
  id: string;
  restaurantId: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  requestData?: any;
  responseData?: any;
  errorMessage?: string;
  createdAt: Date;
}