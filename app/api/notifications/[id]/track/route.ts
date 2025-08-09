import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

// GET /api/notifications/[id]/track - Email tracking pixel
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get client information
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIP = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';

    // Check if notification exists
    const { data: notification, error } = await supabase
      .from('notifications')
      .select('id, type, status')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single();

    if (error || !notification) {
      // Return a 1x1 transparent pixel even if notification not found
      const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      return new NextResponse(pixel, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': pixel.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Only track if it's an email notification and not already read
    if (notification.type === 'email' && notification.status !== 'read') {
      console.log(`Tracking pixel accessed for notification ${params.id}, marking as read`);
      
      // Mark notification as read
      const { data: receiptId, error: readError } = await supabase.rpc('mark_notification_read', {
        p_notification_id: params.id,
        p_read_from: 'email_client',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_location: null
      });

      if (readError) {
        console.error('Error marking notification as read:', readError);
      } else {
        console.log(`Notification ${params.id} marked as read, receipt ID: ${receiptId}`);
      }
    } else {
      console.log(`Tracking pixel accessed for notification ${params.id}, but not marking as read (type: ${notification.type}, status: ${notification.status})`);
    }

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    
    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error in notification tracking:', error);
    
    // Always return a pixel, even on error
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    
    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}