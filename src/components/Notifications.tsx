import { useState, useEffect } from 'react';
import { Bell, Check, Users, UserPlus, UserX, Info, AlertTriangle, AlertCircle, BellRing, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    message: 'João Silva solicitou entrar na equipe LeFil',
    type: 'TEAM_JOIN_REQUEST',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
  },
  {
    id: '2',
    message: 'Sua solicitação para entrar na equipe Marketing foi aprovada',
    type: 'TEAM_JOIN_APPROVED',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  },
  {
    id: '3',
    message: 'Nova marca "TechCorp" foi adicionada à sua equipe',
    type: 'INFO',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: '4',
    message: 'Atenção: Seu plano atual está próximo do limite de créditos',
    type: 'WARNING',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
];

export default function Notifications() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [unreadCount, setUnreadCount] = useState(0);

  // Calculate unread count
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    toast.success('Notificação marcada como lida');
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('Todas as notificações foram marcadas como lidas');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TEAM_JOIN_REQUEST':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'TEAM_JOIN_APPROVED':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'TEAM_JOIN_REJECTED':
        return <UserX className="h-4 w-4 text-red-500" />;
      case 'SYSTEM':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'há pouco tempo';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'relative h-9 w-9 rounded-xl border transition-all duration-300',
            unreadCount > 0 
              ? 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30' 
              : 'border-transparent hover:border-border hover:bg-muted/50'
          )}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-[18px] w-[18px]" />
          ) : (
            <Bell className="h-[18px] w-[18px]" />
          )}

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">
            Notificações {unreadCount > 0 && `(${unreadCount} não lidas)`}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] overflow-hidden rounded-xl border bg-background p-0 shadow-xl"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 items-center justify-center rounded-full bg-primary/10 px-2 text-[11px] font-medium text-primary">
                {unreadCount}
              </span>
            )}
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 gap-1 px-2 text-xs hover:bg-background"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Marcar todas</span>
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length > 0 ? (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'group relative border-b border-border/40 transition-colors last:border-0',
                    !notification.read && 'bg-primary/[0.02]',
                    'hover:bg-muted/40 cursor-pointer'
                  )}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  {!notification.read && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                  )}
                  
                  <div className="flex gap-3 p-4 pl-5">
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                        !notification.read
                          ? 'bg-primary/10'
                          : 'bg-muted/60'
                      )}
                    >
                      <div className={cn(
                        !notification.read ? 'text-primary' : 'text-muted-foreground/70'
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1.5">
                      <p
                        className={cn(
                          'text-sm leading-snug',
                          !notification.read
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground/60">
                          {formatTime(notification.createdAt)}
                        </p>

                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="h-6 gap-1 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/20"
                          >
                            <Check className="h-3 w-3" />
                            Marcar lida
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!notification.read && (
                      <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                <Bell className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="mb-1 text-sm font-medium text-foreground">
                Tudo limpo!
              </p>
              <p className="text-center text-xs text-muted-foreground/70 max-w-[250px]">
                Você não tem notificações no momento
              </p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
