import { User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import PersonalInfoForm from '@/components/perfil/PersonalInfoForm';
import AccountManagement from '@/components/perfil/AccountManagement';
import AvatarUpload from '@/components/perfil/AvatarUpload';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import profileBanner from '@/assets/profile-banner.jpg';

export default function Profile() {
  const { user, isLoading } = useAuth();
  
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
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-56 flex-shrink-0 overflow-hidden">
        <img 
          src={profileBanner} 
          alt="" 
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 85%' }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 flex-shrink-0">
        <div className="bg-card rounded-2xl shadow-lg p-4 lg:p-5 flex items-center gap-4">
          <div className="bg-primary/10 border border-primary/20 shadow-sm rounded-2xl p-3 lg:p-4">
            <UserIcon className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Meu Perfil
            </h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              Gerencie suas informações pessoais e configurações da conta
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 sm:pb-6 lg:pb-8 space-y-6">
        {/* Avatar Section */}
        <div className="bg-card border-0 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Foto de Perfil</h2>
          <AvatarUpload
            userId={user.id}
            currentAvatarUrl={profileData.avatarUrl}
            userName={profileData.name}
            onAvatarUpdate={(url) => setProfileData(prev => ({ ...prev, avatarUrl: url || '' }))}
          />
        </div>

        {/* Personal Info - Full Width */}
        <PersonalInfoForm initialData={profileData} />

        {/* Advanced Settings - Collapsible */}
        <AccountManagement userEmail={user.email || ''} />
      </main>
    </div>
  );
}
