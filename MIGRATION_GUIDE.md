# Database Migration Guide

This guide provides step-by-step instructions for setting up the KelolakKos.com database using Supabase.

## ⚠️ CRITICAL: Migration Order

**You MUST run migrations in this exact order to avoid dependency errors:**

```sql
1. supabase-migration-base-tables.sql     -- Creates all core tables (REQUIRED FIRST)
2. supabase-migration-multi-kos.sql       -- Adds multi-kos support to existing tables  
3. supabase-migration-add-pdf-path.sql    -- Adds PDF path column to tagihan table
4. supabase-migration-payment-info.sql    -- Creates payment_info table
5. supabase-migration-whatsapp-settings.sql -- Creates WhatsApp-related tables
6. supabase-migration-notifications.sql   -- Creates notification tracking tables
7. supabase-migration-payment-gateway.sql -- Creates payment gateway tables
8. setup-storage-bucket.sql               -- Sets up file storage buckets
```

## 🏗 Database Setup Process

### Step 1: Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Create New Project**: Create a new Supabase project
3. **Get Credentials**: Note down your project URL and API keys
4. **SQL Editor Access**: Open the SQL Editor in your Supabase dashboard

### Step 2: Run Base Migration (CRITICAL FIRST STEP)

**File:** `supabase-migration-base-tables.sql`

This migration creates all the fundamental tables that other migrations depend on:

```sql
-- Core tables created:
- kos (boarding houses)
- kamar (rooms) 
- penghuni (tenants)
- add_on (additional services)
- template_tagihan (invoice templates)
- tagihan (invoices)
- tagihan_addon (junction table)
- add_on_tetap (template add-ons)
- template_tagihan_kamar (template rooms)
```

**Run in Supabase SQL Editor:**
1. Copy the entire content of `supabase-migration-base-tables.sql`
2. Paste into Supabase SQL Editor
3. Click "Run" 
4. Verify all tables are created successfully

### Step 3: Multi-Kos Support

**File:** `supabase-migration-multi-kos.sql`

Adds support for managing multiple boarding houses per user.

**What it does:**
- Adds `kos_id` columns to existing tables
- Updates Row Level Security (RLS) policies
- Adds indexes for performance

### Step 4: PDF Path Support  

**File:** `supabase-migration-add-pdf-path.sql`

Adds PDF file path storage to the invoice system.

**What it does:**
- Adds `pdf_path` column to `tagihan` table
- Enables PDF invoice generation and storage

### Step 5: Payment Information

**File:** `supabase-migration-payment-info.sql`

Creates tables for storing bank account and e-wallet information.

**Tables created:**
- `payment_info` - Bank accounts, e-wallets, payment instructions

### Step 6: WhatsApp Integration

**File:** `supabase-migration-whatsapp-settings.sql`

Enables WhatsApp messaging functionality.

**Tables created:**
- `whatsapp_settings` - WhatsApp connection configuration per kos
- `whatsapp_messages` - Message history and delivery tracking

### Step 7: Notification System

**File:** `supabase-migration-notifications.sql`

Creates comprehensive notification tracking system.

**Tables created:**
- `notifications` - Email and WhatsApp message tracking
- `notification_receipts` - Delivery confirmation tracking  
- `notification_templates` - Message templates

### Step 8: Payment Gateway

**File:** `supabase-migration-payment-gateway.sql`

Integrates Midtrans payment gateway functionality.

**Tables created:**
- `payment_gateway_settings` - Midtrans configuration per kos
- `payment_transactions` - Payment transaction tracking

**Columns added:**
- `payment_link` to `tagihan` table
- `payment_order_id` to `tagihan` table

### Step 9: File Storage Setup

**File:** `setup-storage-bucket.sql`

Sets up Supabase Storage buckets for file uploads.

**Buckets created:**
- `invoices` - PDF invoice storage

## 🔍 Verifying Migrations

After running all migrations, verify your database has these tables:

### Core Tables ✅
- [x] `kos` - Boarding house information
- [x] `kamar` - Room details  
- [x] `penghuni` - Tenant records
- [x] `tagihan` - Invoice records
- [x] `add_on` - Additional services
- [x] `template_tagihan` - Invoice templates

### Junction Tables ✅  
- [x] `tagihan_addon` - Invoice ↔ Add-on relationships
- [x] `add_on_tetap` - Template ↔ Add-on relationships
- [x] `template_tagihan_kamar` - Template ↔ Room relationships

### Integration Tables ✅
- [x] `payment_info` - Payment settings
- [x] `whatsapp_settings` - WhatsApp configuration
- [x] `whatsapp_messages` - WhatsApp message history
- [x] `notifications` - Notification tracking
- [x] `notification_receipts` - Delivery tracking
- [x] `notification_templates` - Message templates
- [x] `payment_gateway_settings` - Payment gateway config
- [x] `payment_transactions` - Payment tracking

### Storage Buckets ✅
- [x] `invoices` - PDF file storage

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access data from their own kos
- Proper authentication is required
- Data isolation between different users

## 📊 Database Indexes

Performance indexes are automatically created for:
- Foreign key relationships
- Frequently queried columns
- Status and filter columns

## 🔧 Troubleshooting

### Common Issues

#### 1. "Table already exists" errors
**Cause:** Running migrations out of order or multiple times
**Solution:** 
- Drop conflicting tables: `DROP TABLE IF EXISTS table_name CASCADE;`
- Re-run migrations in correct order

#### 2. "Column does not exist" errors  
**Cause:** Missing base migration or running migrations out of order
**Solution:**
- Ensure `supabase-migration-base-tables.sql` was run first
- Check that all dependent tables exist

#### 3. RLS policy errors
**Cause:** Missing kos_id columns or foreign key relationships
**Solution:**
- Verify all foreign key constraints are in place
- Check that RLS policies reference correct columns

#### 4. Storage bucket errors
**Cause:** Insufficient permissions or bucket already exists
**Solution:**
- Run storage setup as project owner
- Check bucket permissions in Supabase dashboard

### Rollback Procedures

If you need to rollback migrations:

```sql
-- Drop all tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS payment_gateway_settings CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_receipts CASCADE; 
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_settings CASCADE;
DROP TABLE IF EXISTS payment_info CASCADE;
DROP TABLE IF EXISTS template_tagihan_kamar CASCADE;
DROP TABLE IF EXISTS add_on_tetap CASCADE;
DROP TABLE IF EXISTS tagihan_addon CASCADE;
DROP TABLE IF EXISTS tagihan CASCADE;
DROP TABLE IF EXISTS template_tagihan CASCADE;
DROP TABLE IF EXISTS add_on CASCADE;
DROP TABLE IF EXISTS penghuni CASCADE;
DROP TABLE IF EXISTS kamar CASCADE;
DROP TABLE IF EXISTS kos CASCADE;

-- Drop storage buckets
DELETE FROM storage.buckets WHERE id = 'invoices';
```

## 🧪 Testing Your Setup

After running all migrations, test your setup:

1. **Create test data:**
   ```sql
   -- Insert test kos
   INSERT INTO kos (nama_kos, user_id) VALUES ('Test Kos', auth.uid());
   
   -- Insert test room
   INSERT INTO kamar (kos_id, nomor_kamar, harga, status) 
   VALUES ((SELECT id FROM kos LIMIT 1), '101', 1000000, 'kosong');
   ```

2. **Test RLS policies:**
   ```sql
   -- Should return data (as authenticated user)
   SELECT * FROM kos;
   SELECT * FROM kamar;
   ```

3. **Test foreign key relationships:**
   ```sql
   -- Should work without errors
   INSERT INTO penghuni (kos_id, nama, kamar_id) 
   VALUES (
     (SELECT id FROM kos LIMIT 1), 
     'Test Tenant',
     (SELECT id FROM kamar LIMIT 1)
   );
   ```

## 🚀 Production Deployment

For production deployment:

1. **Backup Strategy:** Set up automated backups
2. **Environment Variables:** Update all environment variables  
3. **SSL/TLS:** Ensure all connections use HTTPS
4. **Monitoring:** Set up database monitoring
5. **Scaling:** Configure appropriate instance size

## 📞 Support

If you encounter issues:

1. **Check Logs:** Review Supabase logs for detailed error messages
2. **Documentation:** Refer to [Supabase documentation](https://supabase.com/docs)
3. **Community:** Ask questions in [Supabase Discord](https://discord.supabase.com)
4. **Issues:** Create GitHub issue with detailed error information

## 📋 Migration Checklist

Use this checklist to ensure proper setup:

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] `supabase-migration-base-tables.sql` executed successfully
- [ ] `supabase-migration-multi-kos.sql` executed successfully  
- [ ] `supabase-migration-add-pdf-path.sql` executed successfully
- [ ] `supabase-migration-payment-info.sql` executed successfully
- [ ] `supabase-migration-whatsapp-settings.sql` executed successfully
- [ ] `supabase-migration-notifications.sql` executed successfully
- [ ] `supabase-migration-payment-gateway.sql` executed successfully
- [ ] `setup-storage-bucket.sql` executed successfully
- [ ] All expected tables exist in database
- [ ] RLS policies are active
- [ ] Storage buckets are created
- [ ] Test data insertion works
- [ ] Application connects successfully

## 🔄 Future Migrations

When adding new features:

1. **Create migration file:** `supabase-migration-feature-name.sql`
2. **Test locally:** Verify migration works on development database
3. **Document changes:** Update this guide with new migration
4. **Version control:** Commit migration file to repository
5. **Deploy safely:** Run on production during maintenance window

Remember: Always backup your production database before running new migrations!