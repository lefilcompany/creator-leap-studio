import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, MapPin, CalendarDays, Users, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import profileBannerDefault from '@/assets/profile-banner.jpg';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PublicProfileData {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  banner_url: string | null;
  state: string | null;
  city: string | null;
  created_at: string | null;
  team_id: string | null;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (userId && user?.id && userId === user.id) {
      navigate('/profile', { replace: true });
    }
  }, [userId, user?.id, navigate]);

  useEffect(() => {
    if (!userId || userId === user?.id) return;
    loadProfile();
  }, [userId, user?.id]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Load profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, banner_url, state, city, created_at, team_id')
        .eq('id', userId)
        .single();

      if (error || !profileData) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setProfile(profileData);

      // Load team info and admin status
      if (profileData.team_id) {
        const [teamResult, memberResult] = await Promise.all([
          supabase
            .from('teams')
            .select('name, admin_id')
            .eq('id', profileData.team_id)
            .single(),
          supabase
            .from('team_members')
            .select('joined_at')
            .eq('user_id', userId)
            .eq('team_id', profileData.team_id)
            .maybeSingle(),
        ]);

        if (teamResult.data) {
          setTeamName(teamResult.data.name);
          setIsAdmin(teamResult.data.admin_id === userId);
        }
        setJoinedAt(memberResult.data?.joined_at || profileData.created_at);
      }
    } catch (error) {
      console.error('Error loading public profile:', error);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const locationParts = [profile?.city, profile?.state].filter(Boolean).join(', ');

  if (loading) {
    return (
      <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 animate-fade-in">
        <div className="relative w-full h-48 md:h-56 lg:h-64 xl:h-72 bg-muted" />
        <div className="relative px-4 sm:px-6 lg:px-8 -mt-12">
          <div className="bg-card rounded-2xl shadow-lg p-4 lg:p-5 flex items-center gap-4">
            <Skeleton className="h-16 w-16 lg:h-20 lg:w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <div className="bg-card rounded-2xl shadow-lg p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const bannerSrc = profile.banner_url || profileBannerDefault;

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 animate-fade-in">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-56 lg:h-64 xl:h-72 flex-shrink-0 overflow-hidden">
        <img
          src={bannerSrc}
          alt=""
          className="w-full h-full object-cover object-[center_85%] lg:object-[center_65%] xl:object-[center_55%]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 flex-shrink-0">
        <div className="bg-card rounded-2xl shadow-lg p-4 lg:p-5 flex items-center gap-4">
          <Avatar className="h-16 w-16 lg:h-20 lg:w-20 border-4 border-card shadow-md flex-shrink-0">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
            <AvatarFallback className="text-lg lg:text-xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
              {getInitials(profile.name || 'U')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground truncate">
                {profile.name}
              </h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
                  <Crown className="h-3 w-3" />
                  Administrador
                </span>
              )}
            </div>
            {locationParts && (
              <p className="text-sm lg:text-base text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                {locationParts}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex-shrink-0 hidden sm:flex"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 sm:pb-6 lg:pb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Informações</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{profile.email}</p>
                </div>
              </div>

              {/* Location */}
              {locationParts && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Localização</p>
                    <p className="text-sm font-medium text-foreground">{locationParts}</p>
                  </div>
                </div>
              )}

              {/* Team */}
              {teamName && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Equipe</p>
                    <p className="text-sm font-medium text-foreground">{teamName}</p>
                  </div>
                </div>
              )}

              {/* Member since */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Membro desde</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(joinedAt || profile.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile back button */}
        <div className="sm:hidden mt-4">
          <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </main>
    </div>
  );
}
