-- ============================================================================
-- TNCSC DPC (Direct Purchase Centre) Paddy Procurement Queue Schema
-- Target: Supabase Postgres + Realtime
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DPC CENTRES TABLE
CREATE TABLE IF NOT EXISTS dpc_centers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  taluk VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FARMERS TABLE
CREATE TABLE IF NOT EXISTS farmers (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'farmer_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  token_number INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  aadhaar_masked VARCHAR(20),
  mobile VARCHAR(15),
  village VARCHAR(100) NOT NULL,
  num_bags INT NOT NULL DEFAULT 40,
  paddy_variety VARCHAR(100) NOT NULL DEFAULT 'White Ponni',
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- waiting | in_progress | completed | cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. QUEUE TABLE
-- Tracks the 8 real DPC processing stages per farmer
CREATE TABLE IF NOT EXISTS queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_number INT NOT NULL,
  farmer_id VARCHAR(50) REFERENCES farmers(id) ON DELETE CASCADE,
  dpc_id VARCHAR(50) REFERENCES dpc_centers(id) ON DELETE CASCADE,
  current_stage INT NOT NULL DEFAULT 1, 
  -- Stage 1: Token verification (2 min)
  -- Stage 2: Vehicle unloading (5 min)
  -- Stage 3: Winnowing / cleaning (3 min)
  -- Stage 4: Moisture meter check <=17% (3 min)
  -- Stage 5: Electronic weighment (4 min)
  -- Stage 6: Packing into standard TNCSC bags (1.5 min/bag)
  -- Stage 7: Data entry (5 min)
  -- Stage 8: Vendor receipt printing (2 min)
  stage_started_at TIMESTAMPTZ DEFAULT NOW(),
  entry_time TIMESTAMPTZ DEFAULT NOW(),
  estimated_completion TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime Publication for Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE dpc_centers;
ALTER PUBLICATION supabase_realtime ADD TABLE farmers;
ALTER PUBLICATION supabase_realtime ADD TABLE queue;

-- Row Level Security (RLS)
ALTER TABLE dpc_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read dpc_centers" ON dpc_centers FOR SELECT USING (true);
CREATE POLICY "Allow public read farmers" ON farmers FOR SELECT USING (true);
CREATE POLICY "Allow public all queue" ON queue FOR ALL USING (true);
CREATE POLICY "Allow public insert update farmers" ON farmers FOR ALL USING (true);

-- ============================================================================
-- SEED DEMO DATA FOR TNCSC DPC PONNERI
-- ============================================================================

INSERT INTO dpc_centers (id, name, district, taluk, is_active) VALUES
('dpc_ponneri', 'பொன்னேரி நேரடி நெல் கொள்முதல் மையம் (Ponneri DPC)', 'Tiruvallur', 'Ponneri', true),
('dpc_tiruvarur', 'திருவாரூர் மார்க்கெட் கமிட்டி DPC', 'Tiruvarur', 'Tiruvarur', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO farmers (id, token_number, name, aadhaar_masked, mobile, village, num_bags, paddy_variety, assigned_date, status) VALUES
('f_42', 42, 'சுப்ரமணியன் அ', 'XXXX XXXX 1234', '9876543210', 'பொன்னேரி', 40, 'வெள்ளை பொன்னி (White Ponni)', CURRENT_DATE, 'in_progress'),
('f_43', 43, 'முருகன் கே', 'XXXX XXXX 5678', '9876543211', 'மீஞ்சூர்', 30, 'கோ 51 (Co 51)', CURRENT_DATE, 'waiting'),
('f_44', 44, 'ராமசாமி ப', 'XXXX XXXX 9101', '9876543212', 'அத்திப்பட்டு', 50, 'சி.ஆர் 1009 (CR 1009)', CURRENT_DATE, 'waiting'),
('f_45', 45, 'செல்வம் வே', 'XXXX XXXX 1121', '9876543213', 'காட்டுப்பள்ளி', 25, 'வெள்ளை பொன்னி (White Ponni)', CURRENT_DATE, 'waiting'),
('f_46', 46, 'கணேசன் ஆர்', 'XXXX XXXX 3141', '9876543214', 'பழவேற்காடு', 60, 'அடுதுறை (Aduthurai)', CURRENT_DATE, 'waiting')
ON CONFLICT (id) DO NOTHING;

INSERT INTO queue (token_number, farmer_id, dpc_id, current_stage, entry_time) VALUES
(42, 'f_42', 'dpc_ponneri', 4, NOW() - INTERVAL '5 minutes'),
(43, 'f_43', 'dpc_ponneri', 1, NOW()),
(44, 'f_44', 'dpc_ponneri', 1, NOW()),
(45, 'f_45', 'dpc_ponneri', 1, NOW()),
(46, 'f_46', 'dpc_ponneri', 1, NOW())
ON CONFLICT DO NOTHING;
