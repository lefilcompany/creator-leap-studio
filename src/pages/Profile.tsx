import { User as UserIcon, Coins } from 'lucide-react';
import { useEffect, useState } from 'react';
import PersonalInfoForm from '@/components/perfil/PersonalInfoForm';
import TeamInfoCard from '@/components/perfil/TeamInfoCard';
import AccountManagement from '@/components/perfil/AccountManagement';
import AvatarUpload from '@/components/perfil/AvatarUpload';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { user, team, isLoading } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    city: '',
    avatarUrl: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfileData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          state: data.state || '',
          city: data.city || '',
          avatarUrl: data.avatar_url || '',
        });
      }
    };

    loadProfile();
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-0">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-primary/15 via-secondary/15 to-accent/15 p-4 sm:p-6 rounded-xl border border-primary/30 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <div className="flex-shrink-0 bg-gradient-to-br from-primary to-secondary text-white rounded-xl p-2 sm:p-3 shadow-md">
              <UserIcon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
                Meu Perfil
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg mt-1 sm:mt-2">
                Gerencie suas informações pessoais e configurações da conta
              </p>
            </div>
          </div>
        </div>

        {/* Avatar Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Foto de Perfil</h2>
          <AvatarUpload
            userId={user.id}
            currentAvatarUrl={profileData.avatarUrl}
            userName={profileData.name}
            onAvatarUpdate={(url) => setProfileData(prev => ({ ...prev, avatarUrl: url || '' }))}
          />
        </div>

        {/* Team Section with Buy Credits Button */}
        {team && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Minha Equipe
              </h2>
              <Button
                onClick={() => window.location.href = '/plans'}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                <Coins className="h-4 w-4 mr-2" />
                Comprar Créditos
              </Button>
            </div>
            <TeamInfoCard 
              team={team} 
              userRole={team.admin_id === user.id ? 'admin' : 'member'} 
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
          <div className="flex-1">
            <PersonalInfoForm initialData={profileData} />
          </div>
          
          {/* Advanced Settings */}
          <div className="flex-1">
            <AccountManagement userEmail={user.email || ''} />
          </div>
        </div>
      </div>
    </div>
  );
}
