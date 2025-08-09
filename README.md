# KelolakKos.com - Kos Management System

A comprehensive web application for managing boarding houses (kos) in Indonesia, built with Next.js, TypeScript, and Supabase.

## 🏠 Overview

KelolakKos.com is a modern web application that helps boarding house owners manage their properties efficiently. The system provides tools for room management, tenant tracking, invoice generation, payment processing, and communication via WhatsApp and email.

## 🚀 Features

### Core Features
- **Multi-Kos Management**: Manage multiple boarding house properties
- **Room Management**: Track room availability, pricing, and status
- **Tenant Management**: Maintain tenant records and rental periods
- **Invoice Generation**: Create and send invoices with PDF generation
- **Payment Processing**: Integration with Midtrans payment gateway
- **WhatsApp Integration**: Send invoices and notifications via WhatsApp
- **Email Notifications**: Automated email delivery with tracking
- **Add-on Services**: Manage additional services and charges

### Dashboard Features
- **Real-time Analytics**: Track payments, occupancy, and revenue
- **Template System**: Create reusable invoice templates
- **Notification Center**: Monitor email and WhatsApp delivery status
- **Payment Settings**: Configure bank accounts and e-wallet details
- **WhatsApp Settings**: Manage WhatsApp connection and messaging

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **File Storage**: Supabase Storage
- **Email**: Resend API
- **WhatsApp**: Baileys (WhatsApp Web API)
- **Payments**: Midtrans, Stripe
- **PDF Generation**: Puppeteer

## 📁 Project Structure

```
kelolakos.com/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── add-on/        # Add-on services API
│   │   ├── auth/          # Authentication API
│   │   ├── kamar/         # Room management API
│   │   ├── kos/           # Boarding house API
│   │   ├── notifications/ # Notification tracking API
│   │   ├── payment-gateway/ # Payment processing API
│   │   ├── payment-info/  # Payment settings API
│   │   ├── penghuni/      # Tenant management API
│   │   ├── tagihan/       # Invoice management API
│   │   ├── template-tagihan/ # Invoice template API
│   │   └── whatsapp/      # WhatsApp integration API
│   ├── dashboard/         # Dashboard pages
│   ├── auth/             # Authentication pages
│   ├── payment/          # Payment result pages
│   └── ...               # Other pages
├── components/           # React components
├── contexts/            # React contexts
├── libs/               # Utility libraries
├── types/              # TypeScript type definitions
└── migration files    # Database migration scripts
```

## 🗄 Database Schema

### Core Tables

#### `kos` - Boarding Houses
- `id` (UUID): Primary key
- `user_id` (UUID): Owner reference
- `nama_kos` (TEXT): Boarding house name
- `alamat` (TEXT): Address
- `deskripsi` (TEXT): Description

#### `kamar` - Rooms
- `id` (UUID): Primary key
- `kos_id` (UUID): Boarding house reference
- `nomor_kamar` (TEXT): Room number
- `harga` (INTEGER): Monthly rent price
- `status` (TEXT): Room status (kosong, terisi, booked)

#### `penghuni` - Tenants
- `id` (UUID): Primary key
- `kos_id` (UUID): Boarding house reference
- `nama` (TEXT): Tenant name
- `kamar_id` (UUID): Room reference
- `nomor_telepon` (TEXT): Phone number
- `email` (TEXT): Email address
- `mulai_sewa` (DATE): Rental start date
- `selesai_sewa` (DATE): Rental end date

#### `tagihan` - Invoices
- `id` (UUID): Primary key
- `kos_id` (UUID): Boarding house reference
- `nomor_invoice` (TEXT): Invoice number
- `kamar_id` (UUID): Room reference
- `status_pembayaran` (TEXT): Payment status
- `tanggal_terbit` (DATE): Issue date
- `tanggal_jatuh_tempo` (DATE): Due date
- `total_tagihan` (INTEGER): Total amount
- `pdf_path` (TEXT): PDF file path
- `payment_link` (TEXT): Payment link
- `payment_order_id` (TEXT): Payment order ID

#### `add_on` - Additional Services
- `id` (UUID): Primary key
- `kos_id` (UUID): Boarding house reference
- `nama` (TEXT): Service name
- `harga` (INTEGER): Service price
- `satuan` (TEXT): Unit (kg, kali, bulan)

### Junction Tables

#### `tagihan_addon` - Invoice Add-ons
- Links invoices with additional services
- `tagihan_id`, `add_on_id`, `qty`

#### `template_tagihan_kamar` - Template Rooms
- Links invoice templates with specific rooms
- `id_template_tagihan`, `id_kamar`

#### `add_on_tetap` - Template Add-ons
- Links invoice templates with default add-ons
- `id_template_tagihan`, `id_add_on`

### Integration Tables

#### `payment_info` - Payment Settings
- Bank account and e-wallet information
- `nama_pemilik`, `bank_name`, `account_number`, etc.

#### `notifications` - Notification Tracking
- Email and WhatsApp delivery tracking
- `type`, `status`, `recipient_email`, `recipient_phone`

#### `whatsapp_settings` - WhatsApp Configuration
- WhatsApp connection settings per boarding house

#### `payment_gateway_settings` - Payment Gateway
- Midtrans configuration and settings

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Midtrans account (for payments)
- Resend account (for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/kelolakos.com.git
   cd kelolakos.com
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   
   # Midtrans
   MIDTRANS_SERVER_KEY=your_midtrans_server_key
   MIDTRANS_CLIENT_KEY=your_midtrans_client_key
   
   # Email
   RESEND_API_KEY=your_resend_api_key
   
   # Other settings
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Database Setup**
   
   Run migrations in this order:
   ```sql
   -- 1. Base tables (REQUIRED FIRST)
   supabase-migration-base-tables.sql
   
   -- 2. Multi-kos support
   supabase-migration-multi-kos.sql
   
   -- 3. Feature additions
   supabase-migration-add-pdf-path.sql
   supabase-migration-payment-info.sql
   supabase-migration-whatsapp-settings.sql
   supabase-migration-notifications.sql
   supabase-migration-payment-gateway.sql
   
   -- 4. Storage setup
   setup-storage-bucket.sql
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to access the application.

## 📋 Usage Guide

### Setting Up Your First Boarding House

1. **Register/Login** to your account
2. **Create a Kos** in the dashboard
3. **Add Rooms** with pricing and status
4. **Add Tenants** and assign them to rooms
5. **Configure Payment Settings** (bank accounts, e-wallets)
6. **Set up WhatsApp** for automated messaging
7. **Create Invoice Templates** for recurring billing

### Creating and Sending Invoices

1. **Manual Invoice Creation**:
   - Go to Tagihan (Invoices)
   - Click "Buat Tagihan"
   - Select room, add services, set dates
   - Generate and send via email/WhatsApp

2. **Using Templates**:
   - Create templates in Template Tagihan
   - Set default add-ons and room selections
   - Generate multiple invoices at once

### Payment Processing

1. **Manual Payments**:
   - Tenants receive invoices with bank details
   - Mark payments as received manually

2. **Online Payments**:
   - Configure Midtrans payment gateway
   - Tenants receive payment links
   - Automatic payment status updates

## 🔧 API Reference

### Authentication
All API endpoints require authentication via Supabase Auth.

### Core Endpoints

#### Kos Management
- `GET /api/kos` - List boarding houses
- `POST /api/kos` - Create boarding house
- `PUT /api/kos/[id]` - Update boarding house
- `DELETE /api/kos/[id]` - Delete boarding house

#### Room Management
- `GET /api/kamar` - List rooms
- `POST /api/kamar` - Create room
- `PUT /api/kamar/[id]` - Update room
- `DELETE /api/kamar/[id]` - Delete room

#### Tenant Management
- `GET /api/penghuni` - List tenants
- `POST /api/penghuni` - Create tenant
- `PUT /api/penghuni/[id]` - Update tenant
- `DELETE /api/penghuni/[id]` - Delete tenant

#### Invoice Management
- `GET /api/tagihan` - List invoices
- `POST /api/tagihan` - Create invoice
- `PUT /api/tagihan/[id]` - Update invoice
- `POST /api/tagihan/[id]/send` - Send invoice
- `GET /api/tagihan/[id]/pdf` - Generate PDF

#### Payment Gateway
- `POST /api/payment-gateway/create-payment` - Create payment link
- `POST /api/payment-gateway/midtrans/callback` - Handle payment callback

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Set Environment Variables**
4. **Deploy**

### Environment Variables for Production
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Payment
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=true

# Email
RESEND_API_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://yourdomain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@kelolakos.com

## 🔄 Migration Order

**IMPORTANT**: Run database migrations in this exact order:

1. `supabase-migration-base-tables.sql` - Creates all core tables (REQUIRED FIRST)
2. `supabase-migration-multi-kos.sql` - Adds multi-kos support
3. `supabase-migration-add-pdf-path.sql` - Adds PDF path column
4. `supabase-migration-payment-info.sql` - Creates payment info table
5. `supabase-migration-whatsapp-settings.sql` - Creates WhatsApp tables
6. `supabase-migration-notifications.sql` - Creates notification tables
7. `supabase-migration-payment-gateway.sql` - Creates payment gateway tables
8. `setup-storage-bucket.sql` - Sets up file storage

## 🧹 Recent Cleanup

This codebase has been recently cleaned up to focus on core functionality:

### Removed Components
- Removed 22 unused marketing/landing page components
- Removed blog section (not core to the application)
- Kept only essential components for dashboard and landing page

### Remaining Components (15 total)
- `ButtonAccount.tsx` - Account management
- `ButtonSignin.tsx` - Authentication
- `ButtonSupport.tsx` - Support functionality
- `DashboardClientLayout.tsx` - Dashboard layout
- `Footer.tsx` - Site footer
- `InvoiceHTML.tsx` - Invoice PDF generation
- `KosSelector.tsx` - Boarding house selector
- `LayoutClient.tsx` - Main layout
- `Modal.tsx` - Modal dialogs
- `NotificationStatsCard.tsx` - Notification statistics
- `NotificationStatus.tsx` - Notification status display
- `OnboardingButton.tsx` - Onboarding flow
- `OnboardingFlow.tsx` - Onboarding process
- `WelcomeModal.tsx` - Welcome dialog

All remaining components are actively used and essential for the application functionality.
