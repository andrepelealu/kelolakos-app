import type { Kamar } from "./kamar";
import type { Kos } from "./kos";

export interface Penghuni {
  id: string;
  kos_id: string;
  nama: string;
  kamar_id: string;
  nomor_telepon: string;
  email: string;
  mulai_sewa: string | null;
  selesai_sewa: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  kamar?: Kamar;
  kos?: Kos;
}
