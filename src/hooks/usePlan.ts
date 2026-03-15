import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export const PLAN_LIMITS = {
  free:    { dailyLimit: 5,        maxFileMb: 25,   watermark: true,  ocr: false, label: "Free" },
  starter: { dailyLimit: 50,       maxFileMb: 100,  watermark: false, ocr: false, label: "Starter" },
  premium: { dailyLimit: Infinity, maxFileMb: 500,  watermark: false, ocr: true,  label: "Pro" },
  team:    { dailyLimit: Infinity, maxFileMb: 1024, watermark: false, ocr: true,  label: "Team" },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

const ANON_DAILY_LIMIT = 3;

interface PlanState {
  plan: string | null;
  jobsToday: number;
  jobsThisMonth: number;
  loading: boolean;
  isPro: boolean;
  canUseTools: boolean;
  remainingToday: number;
  maxFileMb: number;
  watermark: boolean;
}

export interface UsePlanResult extends PlanState {
  refetch: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function usePlan(): UsePlanResult {
  const { user } = useAuth();

  const [state, setState] = useState<PlanState>({
    plan: null,
    jobsToday: 0,
    jobsThisMonth: 0,
    loading: true,
    isPro: false,
    canUseTools: true,
    remainingToday: ANON_DAILY_LIMIT,
    maxFileMb: PLAN_LIMITS.free.maxFileMb,
    watermark: true,
  });

  const fetchPlan = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    if (!user) {
      setState({
        plan: null,
        jobsToday: 0,
        jobsThisMonth: 0,
        loading: false,
        isPro: false,
        canUseTools: true,
        remainingToday: ANON_DAILY_LIMIT,
        maxFileMb: PLAN_LIMITS.free.maxFileMb,
        watermark: true,
      });
      return;
    }

    try {
      const { data: profile } = await db
        .from("profiles")
        .select("plan, jobs_this_month")
        .eq("id", user.id)
        .single();

      const plan: string = profile?.plan ?? "free";
      const jobsThisMonth: number = profile?.jobs_this_month ?? 0;
      const isPro = plan === "premium" || plan === "team";
      const limits = PLAN_LIMITS[plan as PlanKey] ?? PLAN_LIMITS.free;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await db
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("created_at", todayStart.toISOString());

      const jobsToday = count ?? 0;

      const canUseTools = limits.dailyLimit === Infinity || jobsToday < limits.dailyLimit;
      const remainingToday = limits.dailyLimit === Infinity
        ? Infinity
        : Math.max(0, limits.dailyLimit - jobsToday);

      setState({
        plan,
        jobsToday,
        jobsThisMonth,
        loading: false,
        isPro,
        canUseTools,
        remainingToday,
        maxFileMb: limits.maxFileMb,
        watermark: limits.watermark,
      });
    } catch {
      setState({
        plan: "free",
        jobsToday: 0,
        jobsThisMonth: 0,
        loading: false,
        isPro: false,
        canUseTools: true,
        remainingToday: PLAN_LIMITS.free.dailyLimit,
        maxFileMb: PLAN_LIMITS.free.maxFileMb,
        watermark: true,
      });
    }
  }, [user]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return { ...state, refetch: fetchPlan };
}
