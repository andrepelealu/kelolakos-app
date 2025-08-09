import { Tagihan, PaymentInfo } from '@/types';

const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};


const getStatusColor = (status: string): string => {
  switch (status) {
    case 'sudah_bayar': return '#065F46';
    case 'belum_bayar': return '#991B1B';
    case 'terlambat': return '#9A3412';
    default: return '#6B7280';
  }
};

const getStatusBgColor = (status: string): string => {
  switch (status) {
    case 'sudah_bayar': return '#D1FAE5';
    case 'belum_bayar': return '#FEE2E2';
    case 'terlambat': return '#FED7AA';
    default: return '#F3F4F6';
  }
};

interface InvoiceHTMLProps {
  data: Tagihan;
  paymentInfo?: PaymentInfo | null;
}

export const generateInvoiceHTML = ({ data, paymentInfo }: InvoiceHTMLProps): string => {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.nomor_invoice}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #374151;
      background: white;
      padding: 30px 40px;
    }
    
    .header {
      border-bottom: 3px solid #2563EB;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #2563EB;
      margin-bottom: 5px;
    }
    
    .company-subtitle {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 15px;
    }
    
    .invoice-number {
      font-size: 20px;
      font-weight: 600;
      color: #374151;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 5px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    
    .info-label {
      font-size: 12px;
      color: #6B7280;
      font-weight: 500;
      width: 40%;
    }
    
    .info-value {
      font-size: 12px;
      color: #111827;
      font-weight: 600;
      width: 60%;
      text-align: right;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-align: center;
      color: ${getStatusColor(data.status_pembayaran)};
      background-color: ${getStatusBgColor(data.status_pembayaran)};
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    .table th {
      background-color: #F9FAFB;
      border: 1px solid #E5E7EB;
      padding: 10px 8px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
    }
    
    .table td {
      border: 1px solid #F3F4F6;
      padding: 8px;
      font-size: 11px;
      color: #374151;
    }
    
    .table .text-right {
      text-align: right;
    }
    
    .table .text-center {
      text-align: center;
    }
    
    .total-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
    }
    
    .grand-total {
      background-color: #F3F4F6;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
    }
    
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .grand-total-label {
      font-size: 16px;
      font-weight: 700;
      color: #374151;
    }
    
    .grand-total-value {
      font-size: 18px;
      font-weight: 700;
      color: #2563EB;
    }
    
    .payment-section {
      margin-top: 30px;
      padding: 20px;
      background-color: #F8FAFC;
      border: 2px solid #E2E8F0;
      border-radius: 8px;
    }
    
    .payment-title {
      margin: 0 0 15px 0;
      font-size: 14px;
      font-weight: 700;
      color: #1E40AF;
      text-align: center;
      border-bottom: 2px solid #3B82F6;
      padding-bottom: 8px;
    }
    
    .payment-info {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .payment-method {
      background-color: white;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
    }
    
    .payment-method-title {
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    }
    
    .payment-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .payment-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .payment-label {
      font-size: 11px;
      color: #6B7280;
      font-weight: 500;
    }
    
    .payment-value {
      font-size: 11px;
      color: #111827;
      font-weight: 600;
    }
    
    .payment-number {
      font-family: 'Courier New', monospace;
      background-color: #FEF3C7;
      padding: 2px 6px;
      border-radius: 3px;
      color: #92400E;
    }
    
    .payment-notes {
      background-color: #EBF8FF;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #3B82F6;
    }
    
    .payment-notes-title {
      margin: 0 0 8px 0;
      font-size: 12px;
      font-weight: 600;
      color: #1E40AF;
    }
    
    .payment-notes-text {
      margin: 0;
      font-size: 10px;
      color: #374151;
      line-height: 1.5;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #9CA3AF;
      font-size: 10px;
      line-height: 1.4;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .footer {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${paymentInfo?.nama_kos?.toUpperCase() || 'KELOLAKOS'}</div>
    <div class="company-subtitle">${paymentInfo?.nama_pemilik || 'Sistem Manajemen Kos'}</div>
    <div class="invoice-number">Invoice: ${data.nomor_invoice}</div>
  </div>

  <div class="section">
    <div class="section-title">Informasi Tagihan</div>
    
    <div class="info-row">
      <div class="info-label">Nomor Kamar:</div>
      <div class="info-value">${data.kamar?.nomor_kamar || '-'}</div>
    </div>
    
    <div class="info-row">
      <div class="info-label">Nama Penghuni:</div>
      <div class="info-value">${data.penghuni?.nama || '-'}</div>
    </div>
    
    <div class="info-row">
      <div class="info-label">Tanggal Terbit:</div>
      <div class="info-value">${formatDate(data.tanggal_terbit)}</div>
    </div>
    
    <div class="info-row">
      <div class="info-label">Tanggal Jatuh Tempo:</div>
      <div class="info-value">${formatDate(data.tanggal_jatuh_tempo)}</div>
    </div>
    
  </div>

  <div class="section">
    <div class="section-title">Rincian Tagihan</div>
    
    <div class="info-row">
      <div class="info-label">Harga Sewa Kamar:</div>
      <div class="info-value">${formatRupiah(data.kamar?.harga || 0)}</div>
    </div>

    ${data.add_ons && data.add_ons.length > 0 ? `
      <table class="table">
        <thead>
          <tr>
            <th style="width: 40%">Layanan Tambahan</th>
            <th style="width: 20%" class="text-center">Qty</th>
            <th style="width: 20%" class="text-right">Harga</th>
            <th style="width: 20%" class="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${data.add_ons.map(addon => `
            <tr>
              <td>${addon.add_on?.nama || '-'}</td>
              <td class="text-center">${addon.qty}</td>
              <td class="text-right">${formatRupiah(addon.add_on?.harga || 0)}</td>
              <td class="text-right">${formatRupiah((addon.add_on?.harga || 0) * addon.qty)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <div class="info-row">
      <div class="info-label">Total Add-on:</div>
      <div class="info-value">${formatRupiah(data.add_on)}</div>
    </div>
    
    <div class="info-row">
      <div class="info-label">Denda:</div>
      <div class="info-value">${formatRupiah(data.denda)}</div>
    </div>
  </div>

  <div class="total-section">
    <div class="grand-total">
      <div class="grand-total-row">
        <div class="grand-total-label">TOTAL TAGIHAN:</div>
        <div class="grand-total-value">${formatRupiah(data.total_tagihan)}</div>
      </div>
    </div>
  </div>

  ${paymentInfo ? `
  <div class="payment-section">
    <h3 class="payment-title">📋 INFORMASI PEMBAYARAN</h3>
    
    <div class="payment-info">
      <div class="payment-method">
        <h4 class="payment-method-title">🏦 Transfer Bank</h4>
        <div class="payment-details">
          <div class="payment-detail-row">
            <span class="payment-label">Bank:</span>
            <span class="payment-value">${paymentInfo.bank_name}</span>
          </div>
          <div class="payment-detail-row">
            <span class="payment-label">No. Rekening:</span>
            <span class="payment-value payment-number">${paymentInfo.account_number}</span>
          </div>
          <div class="payment-detail-row">
            <span class="payment-label">Atas Nama:</span>
            <span class="payment-value">${paymentInfo.account_holder_name}</span>
          </div>
        </div>
      </div>
      
      ${paymentInfo.ewallet_type && paymentInfo.ewallet_number ? `
      <div class="payment-method">
        <h4 class="payment-method-title">📱 E-Wallet</h4>
        <div class="payment-details">
          <div class="payment-detail-row">
            <span class="payment-label">Jenis:</span>
            <span class="payment-value">${paymentInfo.ewallet_type}</span>
          </div>
          <div class="payment-detail-row">
            <span class="payment-label">Nomor:</span>
            <span class="payment-value payment-number">${paymentInfo.ewallet_number}</span>
          </div>
          ${paymentInfo.ewallet_holder_name ? `
          <div class="payment-detail-row">
            <span class="payment-label">Atas Nama:</span>
            <span class="payment-value">${paymentInfo.ewallet_holder_name}</span>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}
      
      ${paymentInfo.payment_notes ? `
      <div class="payment-notes">
        <h4 class="payment-notes-title">💡 Catatan Pembayaran</h4>
        <p class="payment-notes-text">${paymentInfo.payment_notes}</p>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    Terima kasih atas kepercayaan Anda. Untuk pertanyaan, hubungi pengelola ${paymentInfo?.nama_kos || 'kos'}.<br>
    Dokumen ini dibuat secara otomatis oleh sistem Kelolakos.
  </div>
</body>
</html>
  `;
};

export default generateInvoiceHTML;