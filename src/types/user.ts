export interface User {
  id?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  state?: string;
  city?: string;
  teamId?: string | null;
  role?: 'ADMIN' | 'MEMBER' | 'WITHOUT_TEAM';
  status?: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'NO_TEAM';
  tutorialCompleted?: boolean;
}