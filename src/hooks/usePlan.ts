import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const FREE_DAILY_LIMIT = 5;
const ANON_DAILY_LIMIT = 3;

interface PlanState {
  plan: string | null;
  jobsToday: number;
  jobsThisMonth: number;
  loading: boolean;
  isPro: boolean;
  canUseTools: boolean;
  remainingToday: number;
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
  });

  const fetchPlan = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    if (!user) {
      // Anonymous — allow up to ANON_DAILY_LIMIT
      // We can't track truly without auth, so we allow access optimistically
      setState({
        plan: null,
        jobsToday: 0,
        jobsThisMonth: 0,
        loading: false,
        isPro: false,
        canUseTools: true,
        remainingToday: ANON_DAILY_LIMIT,
      });
      return;
    }

    try {
      // Fetch profile
      const { data: profile } = await db
        .from("profiles")
        .select("plan, jobs_this_month")
        .eq("id", user.id)
        .single();

      const plan: string = profile?.plan ?? "free";
      const jobsThisMonth: number = profile?.jobs_this_month ?? 0;
      const isPro = plan === "premium" || plan === "team";

      // Count today's completed jobs
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await db
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("created_at", todayStart.toISOString());

      const jobsToday = count ?? 0;

      let canUseTools: boolean;
      let remainingToday: number;

      if (isPro) {
        canUseTools = true;
        remainingToday = Infinity;
      } else {
        remainingToday = Math.max(0, FREE_DAILY_LIMIT - jobsToday);
        canUseTools = jobsToday < FREE_DAILY_LIMIT;
      }

      setState({
        plan,
        jobsToday,
        jobsThisMonth,
        loading: false,
        isPro,
        canUseTools,
        remainingToday,
      });
    } catch {
      // On error, allow usage (fail open)
      setState({
        plan: "free",
        jobsToday: 0,
        jobsThisMonth: 0,
        loading: false,
        isPro: false,
        canUseTools: true,
        remainingToday: FREE_DAILY_LIMIT,
      });
    }
  }, [user]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return { ...state, refetch: fetchPlan };
}
