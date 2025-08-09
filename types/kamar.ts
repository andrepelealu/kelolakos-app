import type { Kos } from "./kos";

export interface Kamar {
  id: string;
  kos_id: string;
  nomor_kamar: string;
  harga: number;
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  kos?: Kos;
}
