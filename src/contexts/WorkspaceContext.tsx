import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type WorkspacePermissions = {
  brands: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  content: { view: boolean; create: boolean };
  history: { view: boolean; delete: boolean };
  calendars: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  personas: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  themes: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  members: { manage: boolean };
  billing: { manage: boolean };
};

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  avatar_url: string | null;
  is_personal: boolean;
  credit_mode: 'personal' | 'shared';
  shared_credits: number;
  legacy_team_id: string | null;
  owner_plan_id?: string | null;
  owner_plan_name?: string | null;
  owner_subscription_status?: string | null;
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string | null;
  role: 'owner' | 'member';
  status: 'pending' | 'active';
  permissions: WorkspacePermissions;
  monthly_credit_limit: number | null;
  credits_used_this_month: number;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentMembership: WorkspaceMembership | null;
  loading: boolean;
  switchWorkspace: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  isOwner: boolean;
  hasPermission: (path: string) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setWorkspaces([]);
      setMemberships([]);
      setCurrentId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: mems } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const wsIds = (mems || []).map((m: any) => m.workspace_id);
      let wsData: any[] = [];
      if (wsIds.length) {
        const { data } = await supabase
          .from('workspaces')
          .select('*')
          .in('id', wsIds);
        wsData = data || [];
      }

      // current_workspace_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_workspace_id')
        .eq('id', user.id)
        .maybeSingle();

      setMemberships((mems || []) as any);
      setWorkspaces(wsData as any);
      const initial = profile?.current_workspace_id && wsIds.includes(profile.current_workspace_id)
        ? profile.current_workspace_id
        : wsData.find((w: any) => w.is_personal)?.id ?? wsData[0]?.id ?? null;
      setCurrentId(initial);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const switchWorkspace = useCallback(async (id: string) => {
    setCurrentId(id);
    if (user?.id) {
      await supabase.from('profiles').update({ current_workspace_id: id }).eq('id', user.id);
    }
    // Invalidate all workspace-scoped queries so UI reloads fresh data
    queryClient.invalidateQueries();
  }, [user?.id, queryClient]);

  const currentWorkspace = useMemo(
    () => workspaces.find(w => w.id === currentId) ?? null,
    [workspaces, currentId]
  );
  const currentMembership = useMemo(
    () => memberships.find(m => m.workspace_id === currentId) ?? null,
    [memberships, currentId]
  );
  const isOwner = !!currentWorkspace && currentWorkspace.owner_id === user?.id;

  const hasPermission = useCallback((path: string) => {
    if (isOwner) return true;
    if (!currentMembership) return false;
    const parts = path.split('.');
    let cur: any = currentMembership.permissions;
    for (const p of parts) {
      if (cur == null) return false;
      cur = cur[p];
    }
    return !!cur;
  }, [currentMembership, isOwner]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      currentMembership,
      loading,
      switchWorkspace,
      reload: load,
      isOwner,
      hasPermission,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
