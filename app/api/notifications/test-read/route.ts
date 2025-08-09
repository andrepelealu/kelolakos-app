import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

// POST /api/notifications/test-read - Test endpoint to manually mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notification_id, read_from = 'manual_test' } = await request.json();

    if (!notification_id) {
      return NextResponse.json({ error: 'notification_id is required' }, { status: 400 });
    }

    // First verify the notification exists and user has access
    const { data: existingNotification, error: fetchError } = await supabase
      .from('notifications')
      .select(`
        id,
        status,
        kos!fk_notifications_kos(user_id)
      `)
      .eq('id', notification_id)
      .single();

    if (fetchError || !existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existingNotification.kos.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Mark as read using database function
    const { data: receiptId, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notification_id,
      p_read_from: read_from,
      p_ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || 'Test Client',
      p_location: null
    });

    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Notification marked as read',
      receipt_id: receiptId,
      previous_status: existingNotification.status
    });

  } catch (error) {
    console.error('Error in test read endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}