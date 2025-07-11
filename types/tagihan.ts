import type { Kamar } from "./kamar";
import type { Penghuni } from "./penghuni";

export interface Tagihan {
  id: string;
  nomor_invoice: string;
  kamar_id: string;
  status_pembayaran: string;
  add_on: number;
  tanggal_terbit: string;
  tanggal_jatuh_tempo: string;
  denda: number;
  total_tagihan: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  kamar?: Kamar;
  penghuni?: Penghuni;
}
