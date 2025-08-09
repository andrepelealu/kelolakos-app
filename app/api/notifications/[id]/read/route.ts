import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import type { MarkReadRequest } from '@/types/notification';

// POST /api/notifications/[id]/read - Mark notification as read
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Note: This endpoint might be called from email/WhatsApp tracking pixels
    // so we don't require authentication, but we do verify the notification exists
    
    const body: MarkReadRequest = await request.json();
    const { read_from, ip_address, user_agent, location } = body;

    // Get client IP if not provided
    const clientIP = ip_address || 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      '127.0.0.1';

    // Get user agent if not provided
    const clientUserAgent = user_agent || request.headers.get('user-agent') || '';

    // First verify the notification exists
    const { data: existingNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, status')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Only mark as read if not already read
    if (existingNotification.status !== 'read') {
      // Mark notification as read using database function
      const { data: receiptId, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: params.id,
        p_read_from: read_from || null,
        p_ip_address: clientIP,
        p_user_agent: clientUserAgent,
        p_location: location || null
      });

      if (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Notification marked as read',
        receipt_id: receiptId 
      });
    }

    // Already read, just return success
    return NextResponse.json({ 
      message: 'Notification already marked as read' 
    });

  } catch (error) {
    console.error('Error in POST /api/notifications/[id]/read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/notifications/[id]/read - Get read receipts for notification
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First verify the notification exists and user has access
    const { data: existingNotification, error: fetchError } = await supabase
      .from('notifications')
      .select(`
        id,
        kos!fk_notifications_kos(user_id)
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existingNotification.kos.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get read receipts
    const { data: receipts, error } = await supabase
      .from('notification_receipts')
      .select('*')
      .eq('notification_id', params.id)
      .order('read_at', { ascending: false });

    if (error) {
      console.error('Error fetching read receipts:', error);
      return NextResponse.json({ error: 'Failed to fetch read receipts' }, { status: 500 });
    }

    return NextResponse.json({ data: receipts || [] });

  } catch (error) {
    console.error('Error in GET /api/notifications/[id]/read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}