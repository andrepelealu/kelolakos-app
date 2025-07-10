export interface Penghuni {
  id: string;
  nama: string;
  nomor_kamar: string;
  nomor_telepon: string;
  email: string;
  mulai_sewa: string | null;
  selesai_sewa: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
