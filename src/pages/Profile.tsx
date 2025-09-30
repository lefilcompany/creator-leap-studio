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
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-xl p-3">
              <UserIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Meu Perfil</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie suas informações pessoais e configurações da conta
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PersonalInfoForm initialData={personalInfo} />
          <TeamInfoCard team={team} userRole={user.email === team?.admin ? 'admin' : 'member'} />
        </div>
        
        {/* Advanced Settings */}
        <AccountManagement userEmail={user.email || ''} />
      </div>
    </div>
  );
}
