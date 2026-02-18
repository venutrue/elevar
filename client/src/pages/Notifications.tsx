import { useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  FileText,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import useApi from '@/hooks/useApi';
import api from '@/api/client';

// ---- Types ----

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ---- Helpers ----

function notificationTypeIcon(type: string) {
  switch (type) {
    case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'message': return <MessageSquare className="w-5 h-5 text-blue-500" />;
    case 'document': return <FileText className="w-5 h-5 text-purple-500" />;
    case 'reminder': return <Calendar className="w-5 h-5 text-orange-500" />;
    case 'payment': return <DollarSign className="w-5 h-5 text-green-600" />;
    case 'info':
    default:
      return <Info className="w-5 h-5 text-indigo-500" />;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) return 'Today';
  if (dateOnly.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---- Component ----

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications, loading, refetch } = useApi<Notification[]>(
    () => api.get('/notifications'),
    []
  );

  const allNotifications = notifications || [];
  const filtered = filter === 'unread'
    ? allNotifications.filter((n) => !n.is_read)
    : allNotifications;

  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  // Group by date
  const grouped = filtered.reduce<Record<string, Notification[]>>((acc, n) => {
    const group = formatDateGroup(n.created_at);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}`, { is_read: true });
      refetch();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      refetch();
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'You are all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All
          <Badge color="gray" className="ml-2">{allNotifications.length}</Badge>
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'unread'
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Unread
          {unreadCount > 0 && <Badge color="red" className="ml-2">{unreadCount}</Badge>}
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<BellOff className="w-8 h-8 text-gray-400" />}
              title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              description={
                filter === 'unread'
                  ? 'You have read all your notifications.'
                  : 'Notifications will appear here when there is activity.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateGroup, groupNotifications]) => (
            <div key={dateGroup}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{dateGroup}</h3>
              <div className="space-y-2">
                {groupNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !notification.is_read ? 'border-l-4 border-l-indigo-600' : ''
                    }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {notificationTypeIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                          {notification.entity_type && (
                            <Badge color="gray" className="mt-2">
                              {notification.entity_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
