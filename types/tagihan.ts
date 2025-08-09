import type { Kamar } from "./kamar";
import type { Penghuni } from "./penghuni";
import type { TagihanAddOn } from "./addon";
import type { Kos } from "./kos";

export interface Tagihan {
  id: string;
  kos_id: string;
  nomor_invoice: string;
  kamar_id: string;
  status_pembayaran: string;
  add_on: number;
  tanggal_terbit: string;
  tanggal_jatuh_tempo: string;
  denda: number;
  total_tagihan: number;
  pdf_path?: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  kamar?: Kamar;
  penghuni?: Penghuni;
  add_ons?: TagihanAddOn[];
  kos?: Kos;
}
