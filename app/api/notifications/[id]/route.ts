import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import type { UpdateNotificationStatusRequest, MarkReadRequest } from '@/types/notification';

// GET /api/notifications/[id] - Get single notification
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

    const { data: notification, error } = await supabase
      .from('notifications')
      .select(`
        *,
        kos!fk_notifications_kos(id, nama_kos, user_id),
        penghuni:penghuni_id(id, nama, nomor_telepon, email),
        tagihan:tagihan_id(id, nomor_invoice, tanggal_terbit, total_tagihan),
        receipts:notification_receipts(*)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching notification:', error);
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Check if user owns the kos
    if (!notification.kos || notification.kos.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(notification);

  } catch (error) {
    console.error('Error in GET /api/notifications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications/[id] - Update notification status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateNotificationStatusRequest = await request.json();
    const { status, external_message_id, email_message_id, error_message } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
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

    // Update notification status using database function
    const { data: updated, error } = await supabase.rpc('update_notification_status', {
      p_notification_id: params.id,
      p_status: status,
      p_external_message_id: external_message_id || null,
      p_email_message_id: email_message_id || null,
      p_error_message: error_message || null
    });

    if (error || !updated) {
      console.error('Error updating notification status:', error);
      return NextResponse.json({ error: 'Failed to update notification status' }, { status: 500 });
    }

    // Fetch updated notification
    const { data: notification, error: refetchError } = await supabase
      .from('notifications')
      .select(`
        *,
        penghuni:penghuni_id(id, nama, nomor_telepon, email),
        tagihan:tagihan_id(id, nomor_invoice, tanggal_terbit, total_tagihan),
        receipts:notification_receipts(*)
      `)
      .eq('id', params.id)
      .single();

    if (refetchError) {
      console.error('Error refetching notification:', refetchError);
      return NextResponse.json({ error: 'Failed to fetch updated notification' }, { status: 500 });
    }

    return NextResponse.json(notification);

  } catch (error) {
    console.error('Error in PATCH /api/notifications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Soft delete notification
export async function DELETE(
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

    // Soft delete the notification
    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/notifications/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}