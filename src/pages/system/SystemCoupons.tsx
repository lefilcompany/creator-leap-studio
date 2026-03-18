import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Ticket, Copy, Trash2, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { SystemHeader } from "@/components/system/SystemHeader";

const PRIZE_OPTIONS = [
  { value: "credits_40", label: "40 créditos", prefix: "C4", prizeValue: 40 },
  { value: "credits_100", label: "100 créditos", prefix: "C1", prizeValue: 100 },
  { value: "credits_200", label: "200 créditos", prefix: "C2", prizeValue: 200 },
  { value: "credits_custom", label: "Créditos (customizado)", prefix: "CX", prizeValue: 0 },
];

function generateCouponCode(prefix: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${random}`;
}

export default function SystemCoupons() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [prizeOption, setPrizeOption] = useState("credits_100");
  const [customCredits, setCustomCredits] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [customCode, setCustomCode] = useState("");

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
      const selected = PRIZE_OPTIONS.find((o) => o.value === prizeOption);
      if (!selected) throw new Error("Selecione um tipo de prêmio");

      const prizeValue = prizeOption === "credits_custom" 
        ? parseInt(customCredits) 
        : selected.prizeValue;
      
      if (!prizeValue || prizeValue <= 0) throw new Error("Valor de créditos inválido");

      const prefix = customPrefix.trim().toUpperCase() || selected.prefix;
      const code = customCode.trim().toUpperCase() || generateCouponCode(prefix);

      const { error } = await supabase.from("coupons").insert({
        code,
        prefix,
        prize_type: "credits",
        prize_value: prizeValue,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
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
      setCustomCode("");
      setCustomPrefix("");
      setCustomCredits("");
      setMaxUses("");
      setExpiresAt(undefined);
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

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-coupons"] });
      toast.success("Cupom removido");
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const isExpired = (date: string | null) => date && new Date(date) < new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
        <p className="text-muted-foreground text-sm">Crie e gerencie cupons de créditos para seus usuários</p>
      </div>

      {/* Create Coupon Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Criar Novo Cupom
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prize type */}
            <div className="space-y-2">
              <Label>Tipo de Prêmio</Label>
              <Select value={prizeOption} onValueChange={setPrizeOption}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIZE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom credits */}
            {prizeOption === "credits_custom" && (
              <div className="space-y-2">
                <Label>Quantidade de Créditos</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 50"
                  value={customCredits}
                  onChange={(e) => setCustomCredits(e.target.value)}
                />
              </div>
            )}

            {/* Custom prefix */}
            <div className="space-y-2">
              <Label>Prefixo (opcional)</Label>
              <Input
                placeholder="Ex: WELCOME, BLACK"
                maxLength={10}
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para usar o padrão</p>
            </div>

            {/* Custom code */}
            <div className="space-y-2">
              <Label>Código (opcional)</Label>
              <Input
                placeholder="Deixe vazio para gerar automaticamente"
                maxLength={30}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              />
            </div>

            {/* Max uses */}
            <div className="space-y-2">
              <Label>Limite de Usos</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ilimitado"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para ilimitado</p>
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label>Data de Expiração</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt
                      ? format(expiresAt, "PPP", { locale: ptBR })
                      : "Sem expiração"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {expiresAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setExpiresAt(undefined)}
                >
                  Remover expiração
                </Button>
              )}
            </div>
          </div>

          <Button
            onClick={() => createCoupon.mutate()}
            disabled={createCoupon.isPending}
            className="w-full md:w-auto"
          >
            <Ticket className="h-4 w-4 mr-2" />
            {createCoupon.isPending ? "Criando..." : "Criar Cupom"}
          </Button>
        </CardContent>
      </Card>

      {/* Coupons List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Cupons Criados ({coupons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : coupons.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum cupom criado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Prêmio</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon: any) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-semibold">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        {coupon.prize_value} créditos
                      </TableCell>
                      <TableCell>
                        {coupon.uses_count}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : " / ∞"}
                      </TableCell>
                      <TableCell>
                        {coupon.expires_at
                          ? format(new Date(coupon.expires_at), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {!coupon.is_active ? (
                          <Badge variant="secondary">Inativo</Badge>
                        ) : isExpired(coupon.expires_at) ? (
                          <Badge variant="destructive">Expirado</Badge>
                        ) : coupon.max_uses && coupon.uses_count >= coupon.max_uses ? (
                          <Badge variant="secondary">Esgotado</Badge>
                        ) : (
                          <Badge className="bg-green-600">Ativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCode(coupon.code)}
                            title="Copiar código"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCoupon.mutate({ id: coupon.id, isActive: coupon.is_active })}
                            title={coupon.is_active ? "Desativar" : "Ativar"}
                          >
                            <ToggleLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCoupon.mutate(coupon.id)}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
