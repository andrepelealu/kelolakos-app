"use client";

import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { Notification } from "@/types/notification";

const statusConfig = {
  pending: { 
    label: "Menunggu", 
    color: "bg-yellow-100 text-yellow-800",
    icon: "⏳"
  },
  sent: { 
    label: "Terkirim", 
    color: "bg-blue-100 text-blue-800",
    icon: "📤"
  },
  delivered: { 
    label: "Sampai", 
    color: "bg-green-100 text-green-800",
    icon: "✅"
  },
  failed: { 
    label: "Gagal", 
    color: "bg-red-100 text-red-800",
    icon: "❌"
  },
  read: { 
    label: "Dibaca", 
    color: "bg-purple-100 text-purple-800",
    icon: "👁️"
  }
};

const typeConfig = {
  email: {
    label: "Email",
    color: "bg-blue-50 text-blue-700",
    icon: "📧"
  },
  whatsapp: {
    label: "WhatsApp",
    color: "bg-green-50 text-green-700",
    icon: "💬"
  }
};

interface NotificationStatusProps {
  notification: Notification;
  compact?: boolean;
}

export function NotificationStatusBadge({ 
  status 
}: { 
  status: Notification['status'] 
}) {
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

export function NotificationTypeBadge({ 
  type 
}: { 
  type: Notification['type'] 
}) {
  const config = typeConfig[type];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

export function NotificationTimestamp({ 
  notification,
  showRelative = true 
}: { 
  notification: Notification;
  showRelative?: boolean;
}) {
  const getRelevantTimestamp = () => {
    if (notification.read_at) {
      return { time: notification.read_at, label: "Dibaca" };
    }
    if (notification.delivered_at) {
      return { time: notification.delivered_at, label: "Sampai" };
    }
    if (notification.sent_at) {
      return { time: notification.sent_at, label: "Terkirim" };
    }
    if (notification.failed_at) {
      return { time: notification.failed_at, label: "Gagal" };
    }
    return { time: notification.created_at, label: "Dibuat" };
  };

  const { time, label } = getRelevantTimestamp();

  if (showRelative) {
    return (
      <span className="text-xs text-gray-500">
        {label}: {formatDistanceToNow(new Date(time), { addSuffix: true, locale: id })}
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-500">
      {label}: {new Date(time).toLocaleString('id-ID')}
    </span>
  );
}

export function NotificationReadCount({ 
  notification 
}: { 
  notification: Notification 
}) {
  if (!notification.receipts || notification.receipts.length === 0) {
    return null;
  }

  return (
    <span className="text-xs text-purple-600 font-medium">
      📖 {notification.receipts.length} kali dibaca
    </span>
  );
}

export default function NotificationStatus({ 
  notification, 
  compact = false 
}: NotificationStatusProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <NotificationTypeBadge type={notification.type} />
        <NotificationStatusBadge status={notification.status} />
        {notification.receipts && notification.receipts.length > 0 && (
          <NotificationReadCount notification={notification} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <NotificationTypeBadge type={notification.type} />
        <NotificationStatusBadge status={notification.status} />
        <NotificationReadCount notification={notification} />
      </div>
      
      <div className="space-y-1">
        <NotificationTimestamp notification={notification} />
        
        {notification.error_message && (
          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            Error: {notification.error_message}
          </div>
        )}
        
        {notification.retry_count > 0 && (
          <div className="text-xs text-yellow-600">
            Retry: {notification.retry_count}x
          </div>
        )}
      </div>
    </div>
  );
}