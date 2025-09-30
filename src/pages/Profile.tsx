import { User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import PersonalInfoForm from '@/components/perfil/PersonalInfoForm';
import TeamInfoCard from '@/components/perfil/TeamInfoCard';
import AccountManagement from '@/components/perfil/AccountManagement';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, team, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const personalInfo = {
    name: user.name || '',
    email: user.email || '',
    phone: '',
    state: '',
    city: '',
  };

  return (
    <div className="min-h-full w-full">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-0">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-4 sm:p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-xl p-2 sm:p-3">
              <UserIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">Meu Perfil</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Gerencie suas informações pessoais e configurações da conta
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <PersonalInfoForm initialData={personalInfo} />
          <TeamInfoCard team={team} userRole={user.email === team?.admin ? 'admin' : 'member'} />
        </div>
        
        {/* Advanced Settings */}
        <AccountManagement userEmail={user.email || ''} />
      </div>
    </div>
  );
}
