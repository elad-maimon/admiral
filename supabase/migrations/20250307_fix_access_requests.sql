-- Fix 1: Auto-link new auth.users to existing people by email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- If a person already exists with this email, link the auth_user_id
  UPDATE public.people
  SET auth_user_id = NEW.id
  WHERE email = NEW.email AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Allow users who already exist to proactively link their auth_user_id if not linked
CREATE OR REPLACE FUNCTION public.link_my_people_record()
RETURNS void AS $$
BEGIN
  UPDATE public.people
  SET auth_user_id = auth.uid()
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND auth_user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Remove redundant columns from join_requests
DROP INDEX IF EXISTS idx_join_requests_email;

ALTER TABLE join_requests
DROP COLUMN email,
DROP COLUMN name;

-- Fix 3: Create secure function for Admins to fetch pending requests with email & name
CREATE OR REPLACE FUNCTION public.get_pending_join_requests()
RETURNS TABLE (
  id UUID,
  auth_user_id UUID,
  status join_request_status,
  attempts INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  name TEXT
) AS $$
BEGIN
  -- Check admin permission
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    jr.id,
    jr.auth_user_id,
    jr.status,
    jr.attempts,
    jr.created_at,
    jr.updated_at,
    au.email::TEXT,
    (au.raw_user_meta_data->>'full_name')::TEXT AS name
  FROM public.join_requests jr
  JOIN auth.users au ON jr.auth_user_id = au.id
  WHERE jr.status = 'pending'
  ORDER BY jr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
