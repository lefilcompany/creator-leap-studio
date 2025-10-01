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
            'h-8 w-8 md:h-10 md:w-10 rounded-lg xl:rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20 relative',
            unreadCount > 0 && 'text-primary'
          )}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4 md:h-5 md:w-5" />
          ) : (
            <Bell className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          )}

          {unreadCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 h-2.5 w-2.5 md:h-3 md:w-3 bg-primary text-primary-foreground text-[8px] md:text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse border-2 border-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
          <span className="sr-only">
            Notificações {unreadCount > 0 && `(${unreadCount} não lidas)`}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 md:w-96 max-h-[70vh] overflow-hidden border-border/20 shadow-2xl rounded-xl"
        sideOffset={12}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/20 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Notificações</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7 px-2 hover:bg-primary/10 hover:text-primary"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-80">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border/20">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 transition-all duration-200 hover:bg-muted/30 group cursor-pointer',
                    !notification.read && 'bg-primary/5 border-l-4 border-l-primary'
                  )}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        'p-2 rounded-lg flex-shrink-0 mt-0.5',
                        !notification.read
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm leading-relaxed',
                          !notification.read
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground/70">
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
                            className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary/10 hover:text-primary"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar lida
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground/70">
                Você está em dia! Todas as suas notificações foram visualizadas.
              </p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
