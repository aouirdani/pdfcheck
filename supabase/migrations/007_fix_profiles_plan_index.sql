-- 007: Add index on stripe_customer_id for fast webhook lookup
-- Also ensure the profiles table allows service_role to insert (for handle_new_user trigger)
-- and confirm the plan constraint is documented

-- Add index for stripe webhook lookups (customer.subscription.updated lookups by stripe_customer_id)
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Ensure anon role can also INSERT into jobs (needed for unauthenticated tool usage)
-- The existing RLS policy already covers this: "with check (auth.uid() = user_id OR user_id IS NULL)"
-- This migration just documents that the anon insert path is intentional.

-- Note: stripe-webhook was updated to set plan='premium' (not 'pro') to match the
-- profiles_plan_check constraint which only allows: 'free', 'premium', 'team'
