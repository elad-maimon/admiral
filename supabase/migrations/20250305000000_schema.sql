-- ─────────────────────────────────────────────────────────
-- SUPABASE AUTH SCHEMA EXTENSION
-- ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────────────────────
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- PEOPLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE people (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  email                   TEXT UNIQUE,
  role                    TEXT CHECK (role IN ('eng', 'product', 'manager', 'other')),
  team_id                 UUID REFERENCES teams(id) ON DELETE SET NULL,
  auth_user_id            UUID REFERENCES auth.users(id),
  permission              TEXT NOT NULL DEFAULT 'viewer'
                            CHECK (permission IN ('admin', 'member', 'viewer')),
  join_date               DATE,
  leave_date              DATE,
  active                  BOOLEAN NOT NULL DEFAULT TRUE,
  counts_toward_capacity  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- PERSON UNAVAILABILITY
-- ─────────────────────────────────────────────────────────
CREATE TABLE person_unavailability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,  -- always Sunday
  reason      TEXT,
  UNIQUE(person_id, week_start)
);

-- ─────────────────────────────────────────────────────────
-- OBJECTIVES & KEY RESULTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE objectives (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE key_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id  UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  target_value  NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- INITIATIVES
-- ─────────────────────────────────────────────────────────
CREATE TABLE initiatives (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  objective_id UUID REFERENCES objectives(id) ON DELETE SET NULL,
  owner_id     UUID NOT NULL REFERENCES people(id),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- EPICS
-- ─────────────────────────────────────────────────────────
CREATE TABLE epics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id    INTEGER NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  owner_id         UUID REFERENCES people(id),
  planning_status  TEXT NOT NULL DEFAULT 'scoping'
                     CHECK (planning_status IN ('scoping', 'active', 'closed', 'cancelled')),
  importance       INT CHECK (importance IN (1, 2, 3, 4)),
  target_date      DATE,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- DELIVERABLES
-- ─────────────────────────────────────────────────────────
CREATE TABLE deliverables (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id                UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  description            TEXT,
  owner_id               UUID REFERENCES people(id),
  dod                    TEXT,
  status                 TEXT NOT NULL DEFAULT 'backlog'
                           CHECK (status IN ('backlog', 'ideation', 'rfd', 'in_dev',
                                             'done', 'blocked', 'cancelled')),
  estimation_days        NUMERIC,
  planned_week_start     DATE,
  planned_week_end       DATE,
  actual_completion_date DATE,
  slip_count             INT NOT NULL DEFAULT 0,
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- DELIVERABLE DEPENDENCIES
-- ─────────────────────────────────────────────────────────
CREATE TABLE deliverable_dependencies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id          UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  depends_on_entity_type  TEXT NOT NULL
                            CHECK (depends_on_entity_type IN ('deliverable', 'milestone')),
  depends_on_entity_id    UUID NOT NULL,
  UNIQUE(deliverable_id, depends_on_entity_type, depends_on_entity_id),
  CHECK (
    NOT (depends_on_entity_type = 'deliverable'
         AND depends_on_entity_id = deliverable_id)
  )
);

-- ─────────────────────────────────────────────────────────
-- LIGHTHOUSES
-- ─────────────────────────────────────────────────────────
CREATE TABLE lighthouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month       DATE NOT NULL UNIQUE,
  title       TEXT,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'committed', 'closed')),
  created_by  UUID REFERENCES people(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- LIGHTHOUSE ITEMS
-- ─────────────────────────────────────────────────────────
CREATE TABLE lighthouse_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lighthouse_id  UUID NOT NULL REFERENCES lighthouses(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id),
  feature_lead   UUID REFERENCES people(id),
  feature_team   UUID[] DEFAULT '{}',
  order_index    INT DEFAULT 0,
  is_internal    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(lighthouse_id, deliverable_id)
);

-- ─────────────────────────────────────────────────────────
-- MILESTONES
-- ─────────────────────────────────────────────────────────
CREATE TABLE milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id  INTEGER REFERENCES initiatives(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  date           DATE NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'upcoming'
                   CHECK (status IN ('upcoming', 'at_risk', 'hit', 'missed')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- RLS CONFIGURATION
-- ─────────────────────────────────────────────────────────
-- Create user role lookup function
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT permission FROM public.people WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lighthouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lighthouse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- ADMIN POLICIES (ALL access to all tables for admins)
CREATE POLICY "admin_all_teams" ON teams FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_people" ON people FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_pu" ON person_unavailability FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_obj" ON objectives FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_kr" ON key_results FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_init" ON initiatives FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_epics" ON epics FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_deliv" ON deliverables FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_deps" ON deliverable_dependencies FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_lh" ON lighthouses FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_lhi" ON lighthouse_items FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_all_mile" ON milestones FOR ALL USING (get_user_role() = 'admin');

-- PUBLIC AND AUTHENTICATED READ POLICIES
-- Stakeholder URL needs unauthenticated read access, but only for non-internal lighthouse items
CREATE POLICY "public_read_teams" ON teams FOR SELECT USING (true);
CREATE POLICY "public_read_people" ON people FOR SELECT USING (true);
CREATE POLICY "public_read_obj" ON objectives FOR SELECT USING (true);
CREATE POLICY "public_read_kr" ON key_results FOR SELECT USING (true);
CREATE POLICY "public_read_init" ON initiatives FOR SELECT USING (true);
CREATE POLICY "public_read_epics" ON epics FOR SELECT USING (true);
CREATE POLICY "public_read_deliv" ON deliverables FOR SELECT USING (true);
CREATE POLICY "public_read_deps" ON deliverable_dependencies FOR SELECT USING (true);
CREATE POLICY "public_read_lh" ON lighthouses FOR SELECT USING (true);
CREATE POLICY "public_read_mile" ON milestones FOR SELECT USING (true);

-- Only authenticated users or public if not internal
CREATE POLICY "conditional_read_lhi" ON lighthouse_items FOR SELECT USING (
  auth.role() = 'authenticated' OR is_internal = FALSE
);

-- Only authenticated users can read person unavailability to protect privacy
CREATE POLICY "auth_read_pu" ON person_unavailability FOR SELECT TO authenticated USING (true);

-- MEMBER POLICIES
-- Members can create and edit epics and deliverables
CREATE POLICY "member_insert_epics" ON epics FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'member'));
CREATE POLICY "member_update_epics" ON epics FOR UPDATE USING (get_user_role() IN ('admin', 'member'));

CREATE POLICY "member_insert_deliv" ON deliverables FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'member'));
CREATE POLICY "member_update_deliv" ON deliverables FOR UPDATE USING (get_user_role() IN ('admin', 'member'));

CREATE POLICY "member_insert_deps" ON deliverable_dependencies FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'member'));
CREATE POLICY "member_update_deps" ON deliverable_dependencies FOR UPDATE USING (get_user_role() IN ('admin', 'member'));
CREATE POLICY "member_delete_deps" ON deliverable_dependencies FOR DELETE USING (get_user_role() IN ('admin', 'member'));

-- Members can create lighthouses (drafts)
CREATE POLICY "member_insert_lh" ON lighthouses FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'member'));

-- Members can add/remove/reorder lighthouse items (only in draft lighthouses)
CREATE POLICY "member_insert_lhi" ON lighthouse_items FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'member') AND
  EXISTS (SELECT 1 FROM lighthouses WHERE id = lighthouse_id AND status = 'draft')
);
CREATE POLICY "member_update_lhi" ON lighthouse_items FOR UPDATE USING (
  get_user_role() IN ('admin', 'member') AND
  EXISTS (SELECT 1 FROM lighthouses WHERE id = lighthouse_id AND status = 'draft')
);
CREATE POLICY "member_delete_lhi" ON lighthouse_items FOR DELETE USING (
  get_user_role() IN ('admin', 'member') AND
  EXISTS (SELECT 1 FROM lighthouses WHERE id = lighthouse_id AND status = 'draft')
);

-- Members can update initiatives but not delete them (per spec "Cannot delete initiatives")
CREATE POLICY "member_insert_init" ON initiatives FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'member'));
CREATE POLICY "member_update_init" ON initiatives FOR UPDATE USING (get_user_role() IN ('admin', 'member'));
