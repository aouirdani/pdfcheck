-- Fix: "Database error saving new user" on registration
--
-- Root cause: handle_new_user() was SECURITY DEFINER but missing SET search_path = public.
-- When fired by supabase_auth_admin (GoTrue), the function inherited the auth schema
-- search path, so the unqualified "profiles" table could not be resolved.
--
-- Fix: pin search_path = public and use schema-qualified table name.
-- Also removed the UPDATE auth.users (email_confirmed_at) that was inside the trigger
-- — modifying the trigger's own table from within the trigger is unsafe.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
