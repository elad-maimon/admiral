-- JOIN REQUESTS
CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE join_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  name           TEXT,
  status         join_request_status NOT NULL DEFAULT 'pending',
  attempts       INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching requests by email or status quickly
CREATE INDEX idx_join_requests_email ON join_requests(email);
CREATE INDEX idx_join_requests_status ON join_requests(status);
CREATE INDEX idx_join_requests_auth_user ON join_requests(auth_user_id);

-- RLS
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- 1. Unauthenticated users cannot see anything
-- 2. Authenticated users can view ONLY their own request
CREATE POLICY "users_read_own_requests" ON join_requests
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- 3. Authenticated users can INSERT ONLY their own request
CREATE POLICY "users_insert_own_requests" ON join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- 4. Authenticated users can UPDATE ONLY their own request (e.g., to increment attempts or reset to pending)
CREATE POLICY "users_update_own_requests" ON join_requests
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- 5. Admins can read ALL requests
CREATE POLICY "admin_read_all_requests" ON join_requests
  FOR SELECT
  USING (get_user_role() = 'admin');

-- 6. Admins can update ALL requests (e.g., to approve/decline)
CREATE POLICY "admin_update_all_requests" ON join_requests
  FOR UPDATE
  USING (get_user_role() = 'admin');

-- Updated At Trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_join_requests_updated_at
BEFORE UPDATE ON join_requests
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
