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

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'member';

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string | null;
  role: WorkspaceRole;
  status: 'pending' | 'active';
  permissions: WorkspacePermissions | null;
  monthly_credit_limit: number | null;
  credits_used_this_month: number;
}

// Default permission preset by role. Custom JSON in `permissions` overrides leaf values.
export function defaultPermsForRole(role: WorkspaceRole): WorkspacePermissions {
  const all = (v: boolean) => ({ view: v, create: v, edit: v, delete: v });
  if (role === 'owner' || role === 'admin') {
    return {
      brands: all(true), content: { view: true, create: true },
      history: { view: true, delete: true },
      calendars: all(true), personas: all(true), themes: all(true),
      members: { manage: true }, billing: { manage: true },
    };
  }
  if (role === 'viewer') {
    return {
      brands: all(false), content: { view: true, create: false },
      history: { view: true, delete: false },
      calendars: { ...all(false), view: true },
      personas: { ...all(false), view: true },
      themes: { ...all(false), view: true },
      members: { manage: false }, billing: { manage: false },
    };
  }
  // editor / member (legacy)
  return {
    brands: all(true), content: { view: true, create: true },
    history: { view: true, delete: true },
    calendars: all(true), personas: all(true), themes: all(true),
    members: { manage: false }, billing: { manage: false },
  };
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

        // Fetch owner plans to expose plan tag in UI
        const ownerIds = Array.from(new Set(wsData.map((w: any) => w.owner_id).filter(Boolean)));
        if (ownerIds.length) {
          const { data: owners } = await supabase
            .from('profiles')
            .select('id, plan_id, subscription_status')
            .in('id', ownerIds);
          const { data: plans } = await supabase
            .from('plans')
            .select('id, name');
          const plansMap = new Map((plans || []).map((p: any) => [p.id, p.name]));
          const ownersMap = new Map((owners || []).map((o: any) => [o.id, o]));
          wsData = wsData.map((w: any) => {
            const owner = ownersMap.get(w.owner_id);
            return {
              ...w,
              owner_plan_id: owner?.plan_id ?? null,
              owner_plan_name: owner?.plan_id ? plansMap.get(owner.plan_id) ?? null : null,
              owner_subscription_status: owner?.subscription_status ?? null,
            };
          });
        }
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
