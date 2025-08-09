import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

// GET /api/notifications/debug - Debug endpoint to check notification system
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const kosId = searchParams.get('kos_id');

    if (!kosId) {
      return NextResponse.json({ error: 'kos_id is required' }, { status: 400 });
    }

    // Get recent notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        status,
        created_at,
        sent_at,
        delivered_at,
        read_at,
        failed_at,
        external_message_id,
        email_message_id,
        error_message,
        retry_count,
        subject,
        recipient_email,
        recipient_phone,
        receipts:notification_receipts(id, read_at, read_from)
      `)
      .eq('kos_id', kosId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch notifications',
        details: error.message 
      }, { status: 500 });
    }

    // Get notification stats
    const { data: stats, error: statsError } = await supabase
      .from('notifications')
      .select('type, status')
      .eq('kos_id', kosId)
      .is('deleted_at', null);

    const summary = {
      total: stats?.length || 0,
      by_type: {
        email: stats?.filter(n => n.type === 'email').length || 0,
        whatsapp: stats?.filter(n => n.type === 'whatsapp').length || 0
      },
      by_status: {
        pending: stats?.filter(n => n.status === 'pending').length || 0,
        sent: stats?.filter(n => n.status === 'sent').length || 0,
        delivered: stats?.filter(n => n.status === 'delivered').length || 0,
        read: stats?.filter(n => n.status === 'read').length || 0,
        failed: stats?.filter(n => n.status === 'failed').length || 0
      }
    };

    return NextResponse.json({
      summary,
      recent_notifications: notifications || [],
      debug_info: {
        user_id: user.id,
        kos_id: kosId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}