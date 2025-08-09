export type InvoiceStatus = 'draft' | 'menunggu_pembayaran' | 'lunas' | 'terlambat';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
  canEdit: boolean;
  canSendToCustomer: boolean;
  nextStatuses: InvoiceStatus[];
}

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    description: 'Invoice masih dalam tahap penyusunan',
    canEdit: true,
    canSendToCustomer: false,
    nextStatuses: ['menunggu_pembayaran']
  },
  menunggu_pembayaran: {
    label: 'Menunggu Pembayaran',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Invoice telah dikirim, menunggu pembayaran dari penyewa',
    canEdit: false,
    canSendToCustomer: true,
    nextStatuses: ['lunas']
  },
  lunas: {
    label: 'Lunas',
    color: '#10B981',
    bgColor: '#D1FAE5',
    description: 'Invoice telah dibayar lunas',
    canEdit: false,
    canSendToCustomer: true,
    nextStatuses: []
  },
  terlambat: {
    label: 'Terlambat',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    description: 'Pembayaran melewati tanggal jatuh tempo',
    canEdit: false,
    canSendToCustomer: true,
    nextStatuses: ['lunas']
  }
};

export function getStatusConfig(status: string): StatusConfig {
  return INVOICE_STATUS_CONFIG[status as InvoiceStatus] || INVOICE_STATUS_CONFIG.draft;
}

export function getStatusLabel(status: string): string {
  return getStatusConfig(status).label;
}

export function getStatusColor(status: string): string {
  return getStatusConfig(status).color;
}

export function getStatusBgColor(status: string): string {
  return getStatusConfig(status).bgColor;
}

export function canEditInvoice(status: string): boolean {
  return getStatusConfig(status).canEdit;
}

export function canSendToCustomer(status: string): boolean {
  return getStatusConfig(status).canSendToCustomer;
}

export function getNextStatuses(status: string): InvoiceStatus[] {
  return getStatusConfig(status).nextStatuses;
}

export function getStatusActionLabel(fromStatus: string, toStatus: string): string {
  const transitions: Record<string, string> = {
    'draft->menunggu_pembayaran': 'Kirim ke Penyewa',
    'menunggu_pembayaran->lunas': 'Tandai Sudah Dibayar',
    'terlambat->lunas': 'Tandai Sudah Dibayar'
  };
  
  return transitions[`${fromStatus}->${toStatus}`] || `Ubah ke ${getStatusLabel(toStatus)}`;
}

// Helper function to check if invoice is overdue
export function isInvoiceOverdue(invoice: { tanggal_jatuh_tempo: string; status_pembayaran: string }): boolean {
  if (invoice.status_pembayaran === 'lunas') return false;
  
  const dueDate = new Date(invoice.tanggal_jatuh_tempo);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}

// Helper function to get computed status (including overdue logic)
export function getComputedStatus(invoice: { tanggal_jatuh_tempo: string; status_pembayaran: string }): InvoiceStatus {
  if (invoice.status_pembayaran === 'lunas') return 'lunas';
  if (invoice.status_pembayaran === 'draft') return 'draft';
  
  if (isInvoiceOverdue(invoice)) {
    return 'terlambat';
  }
  
  return invoice.status_pembayaran as InvoiceStatus;
}