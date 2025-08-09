import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import type { 
  CreateNotificationRequest, 
  NotificationFilter,
  NotificationStats 
} from '@/types/notification';

// GET /api/notifications - List notifications with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const kosId = searchParams.get('kos_id');
    const type = searchParams.get('type') as 'email' | 'whatsapp' | null;
    const status = searchParams.get('status');
    const penghuniId = searchParams.get('penghuni_id');
    const tagihanId = searchParams.get('tagihan_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!kosId) {
      return NextResponse.json({ error: 'kos_id is required' }, { status: 400 });
    }

    // Verify user owns the kos
    const { data: kosData, error: kosError } = await supabase
      .from('kos')
      .select('id')
      .eq('id', kosId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (kosError || !kosData) {
      return NextResponse.json({ error: 'Kos not found or access denied' }, { status: 403 });
    }

    // Build query - start simple and add relations
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('kos_id', kosId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Try to test if the table exists first
    const { data: testData, error: testError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Notifications table test failed:', testError);
      return NextResponse.json({ 
        error: 'Notifications table not found. Please run the database migration first.',
        details: testError.message 
      }, { status: 500 });
    }

    // If table exists, use the full query with relations
    query = supabase
      .from('notifications')
      .select(`
        *,
        penghuni:penghuni_id(id, nama, nomor_telepon, email),
        tagihan:tagihan_id(id, nomor_invoice, tanggal_terbit, total_tagihan),
        receipts:notification_receipts(*)
      `)
      .eq('kos_id', kosId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (penghuniId) {
      query = query.eq('penghuni_id', penghuniId);
    }
    if (tagihanId) {
      query = query.eq('tagihan_id', tagihanId);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }
    if (search) {
      query = query.or(`content.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    // Get total count
    const { count } = await query;

    // Apply pagination
    const offset = (page - 1) * limit;
    const { data: notifications, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to fetch notifications',
        details: error.message || 'Unknown error'
      }, { status: 500 });
    }

    return NextResponse.json({
      data: notifications || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications - Create new notification
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateNotificationRequest = await request.json();
    const {
      kos_id,
      penghuni_id,
      tagihan_id,
      type,
      subject,
      content,
      recipient_email,
      recipient_phone,
      metadata
    } = body;

    // Validate required fields
    if (!kos_id || !type || !content) {
      return NextResponse.json({ 
        error: 'kos_id, type, and content are required' 
      }, { status: 400 });
    }

    if (type === 'email' && !recipient_email) {
      return NextResponse.json({ 
        error: 'recipient_email is required for email notifications' 
      }, { status: 400 });
    }

    if (type === 'whatsapp' && !recipient_phone) {
      return NextResponse.json({ 
        error: 'recipient_phone is required for WhatsApp notifications' 
      }, { status: 400 });
    }

    // Verify user owns the kos
    const { data: kosData, error: kosError } = await supabase
      .from('kos')
      .select('id')
      .eq('id', kos_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (kosError || !kosData) {
      return NextResponse.json({ error: 'Kos not found or access denied' }, { status: 403 });
    }

    // Create notification using database function
    const { data, error } = await supabase.rpc('log_notification', {
      p_kos_id: kos_id,
      p_type: type,
      p_content: content,
      p_penghuni_id: penghuni_id || null,
      p_tagihan_id: tagihan_id || null,
      p_subject: subject || null,
      p_recipient_email: recipient_email || null,
      p_recipient_phone: recipient_phone || null,
      p_metadata: metadata || {}
    });

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    // Fetch the created notification with relations
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select(`
        *,
        penghuni:penghuni_id(id, nama_lengkap, nomor_hp, email),
        tagihan:tagihan_id(id, bulan, tahun, total_tagihan)
      `)
      .eq('id', data)
      .single();

    if (fetchError) {
      console.error('Error fetching created notification:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch created notification' }, { status: 500 });
    }

    return NextResponse.json(notification, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}