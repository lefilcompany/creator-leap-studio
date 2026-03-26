import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Ticket, Copy, Pencil, Eye, CalendarDays, Infinity, AlertTriangle, Grid3X3, List, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

function generateCouponCode(prefix: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${random}`;
}

const isExpired = (date: string | null) => date ? new Date(date) < new Date() : false;
const isMaxedOut = (coupon: any) => coupon.max_uses && coupon.uses_count >= coupon.max_uses;

function getCouponStatus(coupon: any) {
  if (!coupon.is_active) return { label: "Inativo", variant: "secondary" as const, color: "text-muted-foreground" };
  if (isExpired(coupon.expires_at)) return { label: "Expirado", variant: "destructive" as const, color: "text-destructive" };
  if (isMaxedOut(coupon)) return { label: "Esgotado", variant: "secondary" as const, color: "text-muted-foreground" };
  return { label: "Ativo", variant: "default" as const, color: "text-primary" };
}

interface CouponFormData {
  code: string;
  customCredits: string;
  maxUses: string;
  expiresAt: string;
  description: string;
  planId: string;
  trialDays: string;
}

const initialFormData: CouponFormData = {
  code: "",
  customCredits: "15",
  maxUses: "1",
  expiresAt: "",
  description: "",
  planId: "",
  trialDays: "15",
};

export default function SystemCoupons() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["system-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  const createCoupon = useMutation({
    mutationFn: async () => {
      const prizeValue = parseInt(formData.customCredits);
      if (!prizeValue || prizeValue <= 0) throw new Error("Valor de créditos inválido");

      const code = formData.code.trim().toUpperCase() || generateCouponCode("SOMA");

      const { error } = await supabase.from("coupons").insert({
        code,
        prefix: code.split("-")[0] || "SOMA",
        prize_type: "credits",
        prize_value: prizeValue,
        max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
        expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        created_by: user!.id,
      });

      if (error) {
        if (error.code === "23505") throw new Error("Já existe um cupom com esse código");
        throw error;
      }
      return code;
    },
    onSuccess: (code) => {
      toast.success(`Cupom ${code} criado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["system-coupons"] });
      setFormData(initialFormData);
      setShowCreateModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleCoupon = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-coupons"] });
      toast.success("Cupom atualizado");
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const handleGenerateCode = () => {
    setFormData(prev => ({ ...prev, code: generateCouponCode("SOMA") }));
  };

  const handleOpenCreate = () => {
    setFormData({ ...initialFormData, code: generateCouponCode("SOMA") });
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons</h1>
          <p className="text-muted-foreground text-sm">Gerencie cupons de teste grátis</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Cupom
          </Button>
        </div>
      </div>

      {/* Coupons Display */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : coupons.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum cupom criado ainda.</p>
            <Button onClick={handleOpenCreate} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Criar primeiro cupom
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon: any) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onCopy={copyCode}
              onToggle={(id, isActive) => toggleCoupon.mutate({ id, isActive })}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon: any) => (
            <CouponListItem
              key={coupon.id}
              coupon={coupon}
              
              onCopy={copyCode}
              onToggle={(id, isActive) => toggleCoupon.mutate({ id, isActive })}
            />
          ))}
        </div>
      )}

      {/* Create Coupon Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Criar Cupom</DialogTitle>
            <DialogDescription className="sr-only">Formulário para criar um novo cupom</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Code */}
            <div className="space-y-1.5">
              <Label className="font-semibold">Código</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="SOMA-XXXXXX"
                  className="font-mono"
                />
                <Button variant="outline" onClick={handleGenerateCode} className="shrink-0">
                  Gerar
                </Button>
              </div>
            </div>


            {/* Trial days + Max uses - side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold">Dias de teste</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.trialDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, trialDays: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">Máx. usos</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="∞"
                  value={formData.maxUses}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                />
              </div>
            </div>

            {/* Expiration date */}
            <div className="space-y-1.5">
              <Label className="font-semibold">Data de expiração <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="font-semibold">Descrição interna <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Input
                placeholder="Ex: Campanha Black Friday"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createCoupon.mutate()} disabled={createCoupon.isPending}>
              {createCoupon.isPending ? "Criando..." : "Criar Cupom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Coupon Card Component ───────────────────────────────────────

function CouponCard({ coupon, onCopy, onToggle }: {
  coupon: any;
  onCopy: (code: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  const status = getCouponStatus(coupon);
  const isActive = coupon.is_active && !isExpired(coupon.expires_at) && !isMaxedOut(coupon);

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 border-0 shadow-lg hover:shadow-xl",
      isActive && "ring-2 ring-primary/30"
    )}>
      {/* Top accent bar */}
      <div className={cn(
        "h-1.5 w-full",
        isActive ? "bg-primary" : "bg-muted-foreground/20"
      )} />

      <CardContent className="p-5 space-y-4">
        {/* Header: code + actions */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Ticket className={cn("h-4 w-4", status.color)} />
              <span className="font-mono font-bold text-base tracking-wide">{coupon.code}</span>
            </div>
            {coupon.description && (
              <p className="text-xs text-muted-foreground">{coupon.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopy(coupon.code)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats row with dashed separator */}
        <div className="border-t border-dashed border-border/60 pt-4">
          <div className="grid grid-cols-2 text-center">
            <div>
              <div className="text-2xl font-bold">{coupon.prize_value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Créditos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {coupon.uses_count}
                <span className="text-sm font-normal text-muted-foreground">/{coupon.max_uses || "∞"}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Usos</div>
            </div>
          </div>
        </div>

        {/* Warning if maxed out or expired */}
        {(isExpired(coupon.expires_at) || isMaxedOut(coupon)) && coupon.is_active && (
          <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {isMaxedOut(coupon)
                ? "Limite de resgates atingido — cupom inativado automaticamente"
                : "Cupom expirado"}
            </span>
          </div>
        )}

        {/* Footer: expiry info, toggle, view redemptions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {coupon.expires_at
              ? format(new Date(coupon.expires_at), "dd/MM/yy")
              : <Infinity className="h-3.5 w-3.5" />
            }
            <Switch
              checked={coupon.is_active}
              onCheckedChange={() => onToggle(coupon.id, coupon.is_active)}
              className="ml-1 scale-90"
            />
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7 px-2">
            <Eye className="h-3.5 w-3.5" />
            Resgates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Coupon List Item Component ──────────────────────────────────

function CouponListItem({ coupon, onCopy, onToggle }: {
  coupon: any;
  onCopy: (code: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  const status = getCouponStatus(coupon);
  const isActive = coupon.is_active && !isExpired(coupon.expires_at) && !isMaxedOut(coupon);

  return (
    <Card className={cn(
      "border-0 shadow-md transition-all hover:shadow-lg",
      isActive && "ring-1 ring-primary/20"
    )}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("w-1 h-12 rounded-full shrink-0", isActive ? "bg-primary" : "bg-muted-foreground/20")} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Ticket className={cn("h-4 w-4 shrink-0", status.color)} />
            <span className="font-mono font-bold tracking-wide truncate">{coupon.code}</span>
            {coupon.description && (
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {coupon.description}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm shrink-0">
          <div className="text-center hidden md:block">
            <div className="font-bold">{coupon.prize_value}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Créditos</div>
          </div>
          <div className="text-center hidden md:block">
            <div className="font-bold">{coupon.uses_count}<span className="text-muted-foreground font-normal">/{coupon.max_uses || "∞"}</span></div>
            <div className="text-[10px] text-muted-foreground uppercase">Usos</div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
          <Switch
            checked={coupon.is_active}
            onCheckedChange={() => onToggle(coupon.id, coupon.is_active)}
            className="scale-90"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopy(coupon.code)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
