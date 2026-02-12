import { ImageIcon, Camera, Loader2 } from 'lucide-react';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { useEffect, useState, useRef } from 'react';
import PersonalInfoForm from '@/components/perfil/PersonalInfoForm';
import AccountManagement from '@/components/perfil/AccountManagement';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import profileBannerDefault from '@/assets/profile-banner.jpg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import AvatarChangeModal from '@/components/perfil/AvatarChangeModal';

export default function Profile() {
  const { user, isLoading, refreshProfile } = useAuth();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    city: '',
    avatarUrl: '',
    bannerUrl: '',
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
          bannerUrl: (data as any).banner_url || '',
        });
      }
    };

    loadProfile();
  }, [user]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // === Avatar save handler ===
  const handleAvatarSave = async (blob: Blob) => {
    if (!user?.id) return;
    try {
      setUploadingAvatar(true);

      if (profileData.avatarUrl) {
        const oldPath = profileData.avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
        }
      }

      const fileName = `${Date.now()}.png`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, avatarUrl: publicUrl }));
      await refreshProfile();
      toast.success('Foto de perfil atualizada!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao atualizar foto de perfil');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // === Banner handlers ===
  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !user?.id) return;
      const file = event.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 10MB');
        return;
      }

      setUploadingBanner(true);

      if (profileData.bannerUrl) {
        const oldPath = profileData.bannerUrl.split('/profile-banners/')[1];
        if (oldPath) {
          await supabase.storage.from('profile-banners').remove([oldPath]);
        }
      }

      const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('profile-banners').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('profile-banners').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl } as any)
        .eq('id', user.id);
      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, bannerUrl: publicUrl }));
      toast.success('Banner atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar banner:', error);
      toast.error('Erro ao atualizar banner');
    } finally {
      setUploadingBanner(false);
      if (event.target) event.target.value = '';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const bannerSrc = profileData.bannerUrl || profileBannerDefault;

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Banner - Editável */}
      <div 
        className="relative w-full h-48 md:h-56 lg:h-64 xl:h-72 flex-shrink-0 overflow-hidden group/banner cursor-pointer"
        onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
      >
        <PageBreadcrumb
          variant="overlay"
          items={[{ label: 'Meu Perfil' }]}
        />
        <img 
          src={bannerSrc} 
          alt="" 
          className="w-full h-full object-cover transition-transform duration-500 group-hover/banner:scale-105 object-[center_85%] lg:object-[center_65%] xl:object-[center_55%]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        
        {/* Banner edit overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/banner:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          {uploadingBanner ? (
            <div className="flex items-center gap-2 text-white bg-black/50 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Enviando...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-white bg-black/50 rounded-xl px-5 py-3 backdrop-blur-sm">
              <ImageIcon className="h-6 w-6" />
              <span className="text-sm font-medium">Alterar banner</span>
              <span className="text-xs text-white/70">JPG, PNG ou WebP • Máx 10MB</span>
            </div>
          )}
        </div>
        
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleBannerUpload}
          disabled={uploadingBanner}
        />
      </div>

      {/* Header Card with Avatar */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 flex-shrink-0">
        <div className="bg-card rounded-2xl shadow-lg p-4 lg:p-5 flex items-center gap-4">
          {/* Avatar with hover edit */}
          <div className="relative group/avatar flex-shrink-0">
            <Avatar className="h-16 w-16 lg:h-20 lg:w-20 border-4 border-card shadow-md">
              <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
              <AvatarFallback className="text-lg lg:text-xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                {getInitials(profileData.name || 'U')}
              </AvatarFallback>
            </Avatar>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAvatarModalOpen(true);
              }}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 lg:h-6 lg:w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              )}
            </button>
          </div>
          
          <div className="flex-1 min-w-0">
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
        {/* Personal Info - Full Width */}
        <PersonalInfoForm initialData={profileData} />

        {/* Advanced Settings - Collapsible */}
        <AccountManagement userEmail={user.email || ''} />
      </main>

      {/* Avatar Change Modal */}
      <AvatarChangeModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        currentAvatarUrl={profileData.avatarUrl}
        userName={profileData.name}
        onSave={handleAvatarSave}
        uploading={uploadingAvatar}
      />
    </div>
  );
}
