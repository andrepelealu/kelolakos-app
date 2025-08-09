export interface PaymentInfo {
  id: string;
  nama_pemilik: string;
  nama_kos: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  
  // Alternative payment methods
  ewallet_type?: string | null;
  ewallet_number?: string | null;
  ewallet_holder_name?: string | null;
  
  // Additional info
  payment_notes?: string | null;
  qr_code_image_url?: string | null;
  
  // Status
  is_active: boolean;
  is_primary: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PaymentInfoForm {
  nama_pemilik: string;
  nama_kos: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  ewallet_type: string;
  ewallet_number: string;
  ewallet_holder_name: string;
  payment_notes: string;
  is_active: boolean;
  is_primary: boolean;
}