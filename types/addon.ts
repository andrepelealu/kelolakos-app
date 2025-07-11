export interface AddOn {
  id: string;
  nama: string;
  harga: number;
  satuan: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagihanAddOn {
  tagihan_id: string;
  add_on_id: string;
  qty: number;
  add_on?: AddOn;
}
