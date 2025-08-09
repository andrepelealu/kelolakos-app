import type { AddOn } from "./addon";
import type { Kamar } from "./kamar";
import type { Kos } from "./kos";

export interface TemplateTagihan {
  id: string;
  kos_id: string;
  nama: string;
  tanggal_terbit: number;
  tanggal_jatuh_tempo: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  add_ons?: AddOnTetap[];
  kamars?: TemplateTagihanKamar[];
  kos?: Kos;
}

export interface AddOnTetap {
  id: string;
  id_template_tagihan: string;
  id_add_on: string;
  add_on?: AddOn;
}

export interface TemplateTagihanKamar {
  id: string;
  id_template_tagihan: string;
  id_kamar: string;
  kamar?: Kamar;
}
