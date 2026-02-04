-- Worker relations: Favorites and Blacklist
-- One relation per company-worker pair (favorite OR blacklist)

CREATE TABLE IF NOT EXISTS worker_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('favorite', 'blacklist')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_relations_company ON worker_relations(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_relations_worker ON worker_relations(worker_id);

ALTER TABLE worker_relations ENABLE ROW LEVEL SECURITY;

-- RLS: Companies can manage their own relations
DROP POLICY IF EXISTS "Companies can view own relations" ON worker_relations;
CREATE POLICY "Companies can view own relations"
  ON worker_relations FOR SELECT
  USING (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies can insert own relations" ON worker_relations;
CREATE POLICY "Companies can insert own relations"
  ON worker_relations FOR INSERT
  WITH CHECK (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies can update own relations" ON worker_relations;
CREATE POLICY "Companies can update own relations"
  ON worker_relations FOR UPDATE
  USING (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies can delete own relations" ON worker_relations;
CREATE POLICY "Companies can delete own relations"
  ON worker_relations FOR DELETE
  USING (company_id = auth.uid());
