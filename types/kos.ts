export interface Kos {
  id: string;
  user_id: string;
  nama_kos: string;
  alamat?: string;
  deskripsi?: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}