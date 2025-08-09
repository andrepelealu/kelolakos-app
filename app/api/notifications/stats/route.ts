import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import type { NotificationStats } from '@/types/notification';

// GET /api/notifications/stats - Get notification statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const kosId = searchParams.get('kos_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

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

    // Build base query
    let query = supabase
      .from('notifications')
      .select('type, status, created_at')
      .eq('kos_id', kosId)
      .is('deleted_at', null);

    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notification stats:', error);
      return NextResponse.json({ error: 'Failed to fetch notification stats' }, { status: 500 });
    }

    // Calculate statistics
    const total = notifications?.length || 0;
    const sent = notifications?.filter(n => n.status === 'sent').length || 0;
    const delivered = notifications?.filter(n => n.status === 'delivered').length || 0;
    const failed = notifications?.filter(n => n.status === 'failed').length || 0;
    const read = notifications?.filter(n => n.status === 'read').length || 0;
    const pending = notifications?.filter(n => n.status === 'pending').length || 0;
    const emailCount = notifications?.filter(n => n.type === 'email').length || 0;
    const whatsappCount = notifications?.filter(n => n.type === 'whatsapp').length || 0;

    // Calculate rates
    const readRate = delivered > 0 ? (read / delivered) * 100 : 0;
    const deliveryRate = total > 0 ? ((sent + delivered + read) / total) * 100 : 0;

    const stats: NotificationStats = {
      total,
      sent,
      delivered,
      failed,
      read,
      pending,
      email_count: emailCount,
      whatsapp_count: whatsappCount,
      read_rate: Math.round(readRate * 100) / 100,
      delivery_rate: Math.round(deliveryRate * 100) / 100
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error in GET /api/notifications/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}