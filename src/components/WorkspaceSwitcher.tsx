import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Plus, Settings, UserPlus, Coins } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function initial(name?: string | null) {
  return (name || 'W').trim().charAt(0).toUpperCase();
}

const colors = ['bg-pink-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
function colorFor(id: string) {
  const i = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return colors[i];
}

function WsAvatar({ ws, size }: { ws: { id: string; name: string; avatar_url?: string | null }; size: number }) {
  const px = `${size / 4}rem`;
  if (ws.avatar_url) {
    return (
      <img
        src={ws.avatar_url}
        alt={ws.name}
        className="rounded-md object-cover flex-shrink-0"
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-md text-white font-semibold flex-shrink-0',
        colorFor(ws.id)
      )}
      style={{ width: px, height: px, fontSize: size <= 7 ? '0.75rem' : '1rem' }}
    >
      {initial(ws.name)}
    </span>
  );
}


export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!currentWorkspace) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'group flex items-center gap-2 bg-card border border-border/60 shadow-md hover:shadow-lg hover:bg-muted/60 hover:border-primary/40 transition-all',
            collapsed
              ? 'justify-center rounded-lg p-1.5 w-10 h-10 mx-auto'
              : 'w-full rounded-lg px-2 py-1'
          )}
        >
          <span className={cn('flex-shrink-0', collapsed ? '' : '')}>
            <WsAvatar ws={currentWorkspace} size={6} />
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 min-w-0 text-left text-sm font-medium truncate">
                {currentWorkspace.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-80 p-0 rounded-2xl bg-card shadow-xl border">
        {/* Header card */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <WsAvatar ws={currentWorkspace} size={10} />
            <div className="min-w-0">
              <div className="font-semibold truncate">{currentWorkspace.name}</div>
              <div className="text-xs text-muted-foreground">
                {currentWorkspace.is_personal ? 'Workspace pessoal' : 'Workspace de equipe'}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline" size="sm" className="flex-1"
              onClick={() => { setOpen(false); navigate('/workspace'); }}
            >
              <Settings className="h-3.5 w-3.5 mr-1" /> Configurações
            </Button>
            <Button
              variant="outline" size="sm" className="flex-1"
              onClick={() => { setOpen(false); navigate('/workspace?tab=members&invite=1'); }}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Convidar
            </Button>
          </div>
        </div>

        {/* Credits */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Coins className="h-4 w-4" /> Créditos
            </span>
            <span className="font-semibold">
              {currentWorkspace.credit_mode === 'shared'
                ? currentWorkspace.shared_credits
                : (user?.credits ?? 0)}
              <span className="text-xs text-muted-foreground ml-1">
                {currentWorkspace.credit_mode === 'shared' ? 'compartilhados' : 'pessoais'}
              </span>
            </span>
          </div>
        </div>

        {/* Workspaces list */}
        <div className="p-2">
          <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Todos os workspaces
          </div>
          <div className="max-h-64 overflow-y-auto">
            {workspaces.map((w) => {
              const planLabel = w.owner_plan_name && w.owner_plan_id && w.owner_plan_id !== 'pack_trial'
                ? w.owner_plan_name
                : null;
              return (
                <button
                  key={w.id}
                  onClick={() => { switchWorkspace(w.id); setOpen(false); }}
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60 transition-colors"
                >
                  <WsAvatar ws={w} size={7} />
                  <span className="flex-1 min-w-0 text-left text-sm truncate">{w.name}</span>
                  {w.is_personal && (
                    <span className="text-[10px] uppercase font-semibold bg-muted px-1.5 py-0.5 rounded">
                      Pessoal
                    </span>
                  )}
                  {planLabel && (
                    <span className="text-[10px] uppercase font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {planLabel}
                    </span>
                  )}
                  {w.id === currentWorkspace.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t p-2">
          <button
            onClick={() => { setOpen(false); navigate('/workspace?action=create'); }}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60 text-sm"
          >
            <Plus className="h-4 w-4" /> Criar novo workspace
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
