import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface UserNameLinkProps {
  userId: string;
  userName: string;
  className?: string;
}

export function UserNameLink({ userId, userName, className }: UserNameLinkProps) {
  const { user } = useAuth();
  const targetPath = userId === user?.id ? '/profile' : `/profile/${userId}`;

  return (
    <Link
      to={targetPath}
      className={cn(
        'hover:text-primary hover:underline transition-colors cursor-pointer',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {userName}
    </Link>
  );
}
