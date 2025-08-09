export interface PaymentGatewaySettings {
  id: string;
  kos_id: string;
  provider: 'midtrans' | 'xendit';
  is_active: boolean;
  
  // Midtrans settings
  server_key?: string;
  client_key?: string;
  merchant_id?: string;
  is_production: boolean;
  
  // General settings
  auto_expire_duration: number; // in minutes
  payment_methods: string[];
  
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PaymentTransaction {
  id: string;
  kos_id: string;
  tagihan_id: string;
  
  // Transaction identifiers
  order_id: string;
  transaction_id?: string;
  payment_type?: string;
  
  // Transaction details
  gross_amount: number;
  currency: string;
  
  // Status tracking
  transaction_status: 'pending' | 'settlement' | 'cancel' | 'expire' | 'failure';
  payment_gateway_status?: string;
  
  // Gateway response data
  gateway_response?: any;
  
  // Timestamps
  transaction_time?: string;
  settlement_time?: string;
  expiry_time?: string;
  
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status: string;
  currency: string;
  settlement_time?: string;
}

export interface PaymentLinkRequest {
  tagihan_id: string;
  customer_details: {
    first_name: string;
    last_name?: string;
    email: string;
    phone: string;
  };
  item_details: {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }[];
}

export interface PaymentLink {
  order_id: string;
  payment_url: string;
  expires_at: string;
}