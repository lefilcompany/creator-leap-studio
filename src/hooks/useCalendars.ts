import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CalendarStage = "calendar" | "briefing" | "design" | "review" | "done";

export interface ContentCalendar {
  id: string;
  user_id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  brand_id: string | null;
  persona_id: string | null;
  theme_id: string | null;
  user_input: string | null;
  reference_month: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarItem {
  id: string;
  calendar_id: string;
  user_id: string;
  team_id: string | null;
  title: string;
  theme: string | null;
  scheduled_date: string | null;
  position: number;
  stage: CalendarStage;
  calendar_approved: boolean;
  text_briefing: string | null;
  image_briefing: string | null;
  briefing_approved: boolean;
  briefing_approved_by: string | null;
  briefing_approved_at: string | null;
  design_action_id: string | null;
  design_approved: boolean;
  final_approved: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const useCalendars = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["content-calendars", user?.id, user?.teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_calendars")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ContentCalendar[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });
};

export const useCalendar = (calendarId: string | undefined) => {
  return useQuery({
    queryKey: ["content-calendar", calendarId],
    queryFn: async () => {
      if (!calendarId) return null;
      const { data, error } = await supabase
        .from("content_calendars")
        .select("*")
        .eq("id", calendarId)
        .maybeSingle();
      if (error) throw error;
      return data as ContentCalendar | null;
    },
    enabled: !!calendarId,
  });
};

export const useCalendarItems = (calendarId: string | undefined) => {
  return useQuery({
    queryKey: ["calendar-items", calendarId],
    queryFn: async () => {
      if (!calendarId) return [];
      const { data, error } = await supabase
        .from("calendar_items")
        .select("*")
        .eq("calendar_id", calendarId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as CalendarItem[];
    },
    enabled: !!calendarId,
  });
};

export const useCalendarStats = (calendarId: string) => {
  const { data: items = [] } = useCalendarItems(calendarId);
  const total = items.length;
  const done = items.filter((i) => i.stage === "done").length;
  const inReview = items.filter((i) => i.stage === "review").length;
  const inDesign = items.filter((i) => i.stage === "design").length;
  const inBriefing = items.filter((i) => i.stage === "briefing").length;
  const pending = items.filter((i) => i.stage === "calendar").length;
  return { total, done, inReview, inDesign, inBriefing, pending };
};

export const useCreateCalendar = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      brand_id?: string | null;
      persona_id?: string | null;
      theme_id?: string | null;
      user_input: string;
      reference_month?: string;
      items: Array<{
        title: string;
        theme: string;
        scheduled_date: string;
        platform?: string | null;
        format?: string | null;
      }>;
    }) => {
      if (!user?.id) throw new Error("Não autenticado");

      const { data: calendar, error: calErr } = await supabase
        .from("content_calendars")
        .insert({
          user_id: user.id,
          team_id: user.teamId || null,
          name: input.name,
          description: input.description || null,
          brand_id: input.brand_id || null,
          persona_id: input.persona_id || null,
          theme_id: input.theme_id || null,
          user_input: input.user_input,
          reference_month: input.reference_month || null,
        })
        .select()
        .single();
      if (calErr) throw calErr;

      const itemsPayload = input.items.map((item, idx) => ({
        calendar_id: calendar.id,
        user_id: user.id,
        team_id: user.teamId || null,
        title: item.title,
        theme: item.theme,
        scheduled_date: item.scheduled_date,
        position: idx,
        stage: "calendar" as CalendarStage,
        metadata: {
          platform: item.platform || null,
          format: item.format || null,
        },
      }));

      if (itemsPayload.length > 0) {
        const { error: itemsErr } = await supabase.from("calendar_items").insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }

      return calendar as ContentCalendar;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-calendars"] });
      toast.success("Calendário criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateCalendarItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updates: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from("calendar_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CalendarItem;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["calendar-items", data.calendar_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteCalendar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_calendars").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-calendars"] });
      toast.success("Calendário removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
