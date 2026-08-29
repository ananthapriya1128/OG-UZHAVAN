-- ============================================================================
-- OG UZHAVAN — FULL SUPABASE DATABASE SCHEMA
-- TNCSC Direct Paddy Procurement (DPC) & Farmer Portal
-- Target: Supabase PostgreSQL + Realtime
-- ============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DPC CENTRES TABLE
CREATE TABLE IF NOT EXISTS dpc_centers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  taluk VARCHAR(100) NOT NULL,
  address TEXT,
  officer_in_charge VARCHAR(150),
  contact_mobile VARCHAR(15),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FARMERS TABLE (Farmer Registrations & Identity)
CREATE TABLE IF NOT EXISTS farmers (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'farmer_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  aadhaar_masked VARCHAR(20) NOT NULL,
  ration_card_number VARCHAR(30),
  ration_card_type VARCHAR(10) DEFAULT 'PHH',
  village VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  state VARCHAR(100) DEFAULT 'Tamil Nadu',
  survey_number VARCHAR(50) NOT NULL,
  patta_number VARCHAR(50) NOT NULL,
  taluk VARCHAR(100) NOT NULL,
  cultivated_acres NUMERIC(5, 2) DEFAULT 3.5,
  paddy_variety VARCHAR(100) DEFAULT 'whiteponni',
  cultivation_type VARCHAR(20) DEFAULT 'owner',
  harvest_date DATE,
  vao_cert_number VARCHAR(100),
  vao_officer_name VARCHAR(150),
  vao_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MSP RATES TABLE (Minimum Support Price & TN Govt Bonus)
CREATE TABLE IF NOT EXISTS msp_rates (
  id VARCHAR(50) PRIMARY KEY,
  crop_name_ta VARCHAR(100) NOT NULL,
  crop_name_en VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- fine | common
  central_msp_per_qtl NUMERIC(8, 2) NOT NULL,
  tn_bonus_per_qtl NUMERIC(8, 2) NOT NULL,
  total_rate_per_qtl NUMERIC(8, 2) NOT NULL,
  max_moisture_percent NUMERIC(4, 1) DEFAULT 17.0,
  effective_season VARCHAR(50) DEFAULT 'Kharif 2025-26',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SLOT BOOKINGS TABLE (Farmer DPC Appointments & Tokens)
CREATE TABLE IF NOT EXISTS slot_bookings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'booking_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  token_number INT NOT NULL,
  farmer_id VARCHAR(50) REFERENCES farmers(id) ON DELETE CASCADE,
  dpc_id VARCHAR(50) REFERENCES dpc_centers(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time VARCHAR(50) NOT NULL,
  num_bags INT NOT NULL DEFAULT 40,
  crop_variety_id VARCHAR(50) REFERENCES msp_rates(id),
  estimated_quantity_qtl NUMERIC(8, 2) NOT NULL,
  estimated_total_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'booked', -- booked | arrived | weighing | procured | paid | cancelled
  qr_code_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REALTIME QUEUE TABLE (8 DPC Processing Stages)
CREATE TABLE IF NOT EXISTS queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_number INT NOT NULL,
  farmer_id VARCHAR(50) REFERENCES farmers(id) ON DELETE CASCADE,
  dpc_id VARCHAR(50) REFERENCES dpc_centers(id) ON DELETE CASCADE,
  booking_id VARCHAR(50) REFERENCES slot_bookings(id) ON DELETE CASCADE,
  current_stage INT NOT NULL DEFAULT 1, 
  -- Stage 1: Token Verification (2 min)
  -- Stage 2: Vehicle Unloading (5 min)
  -- Stage 3: Winnowing & Cleaning (3 min)
  -- Stage 4: Moisture Meter Check <=17% (3 min)
  -- Stage 5: Electronic Weighment (4 min)
  -- Stage 6: Packing into standard TNCSC gunny bags (1.5 min/bag)
  -- Stage 7: System Data Entry (2 min)
  -- Stage 8: Vendor Receipt Print (2 min)
  stage_started_at TIMESTAMPTZ DEFAULT NOW(),
  entry_time TIMESTAMPTZ DEFAULT NOW(),
  estimated_completion TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PROCUREMENT & WEIGHBRIDGE RECORDS (Final Weighment & Payout)
CREATE TABLE IF NOT EXISTS procurement_records (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'proc_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  booking_id VARCHAR(50) REFERENCES slot_bookings(id) ON DELETE CASCADE,
  farmer_id VARCHAR(50) REFERENCES farmers(id) ON DELETE CASCADE,
  dpc_id VARCHAR(50) REFERENCES dpc_centers(id) ON DELETE CASCADE,
  actual_bags_count INT NOT NULL,
  total_gross_weight_kg NUMERIC(10, 2) NOT NULL,
  total_net_weight_qtl NUMERIC(10, 2) NOT NULL,
  tested_moisture_percent NUMERIC(4, 1) NOT NULL,
  moisture_deduction_amount NUMERIC(10, 2) DEFAULT 0,
  rate_per_qtl NUMERIC(8, 2) NOT NULL,
  total_payout_amount NUMERIC(12, 2) NOT NULL,
  dbt_status VARCHAR(50) DEFAULT 'initiated', -- initiated | credited | failed
  bank_transaction_id VARCHAR(100),
  procured_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. GRIEVANCES & COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS grievances (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'grv_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  farmer_id VARCHAR(50) REFERENCES farmers(id) ON DELETE CASCADE,
  booking_id VARCHAR(50) REFERENCES slot_bookings(id) ON DELETE CASCADE,
  dpc_id VARCHAR(50) REFERENCES dpc_centers(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- payment_delay | quality_dispute | queue_issue | other
  description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'open', -- open | escalated | resolved
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REALTIME SUBSCRIPTIONS & SECURITY POLICIES
-- ============================================================================

-- Enable Supabase Realtime for live updates across mobile & desktop
ALTER PUBLICATION supabase_realtime ADD TABLE dpc_centers;
ALTER PUBLICATION supabase_realtime ADD TABLE farmers;
ALTER PUBLICATION supabase_realtime ADD TABLE msp_rates;
ALTER PUBLICATION supabase_realtime ADD TABLE slot_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE queue;
ALTER PUBLICATION supabase_realtime ADD TABLE procurement_records;
ALTER PUBLICATION supabase_realtime ADD TABLE grievances;

-- Enable Row Level Security (RLS)
ALTER TABLE dpc_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE msp_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;

-- Allow Public Access for Demo & Direct Mandi Operations
CREATE POLICY "Allow public all dpc_centers" ON dpc_centers FOR ALL USING (true);
CREATE POLICY "Allow public all farmers" ON farmers FOR ALL USING (true);
CREATE POLICY "Allow public all msp_rates" ON msp_rates FOR ALL USING (true);
CREATE POLICY "Allow public all slot_bookings" ON slot_bookings FOR ALL USING (true);
CREATE POLICY "Allow public all queue" ON queue FOR ALL USING (true);
CREATE POLICY "Allow public all procurement_records" ON procurement_records FOR ALL USING (true);
CREATE POLICY "Allow public all grievances" ON grievances FOR ALL USING (true);

-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

-- Seed DPC Centres
INSERT INTO dpc_centers (id, name, district, taluk, address, officer_in_charge, contact_mobile) VALUES
('dpc_ponneri', 'பொன்னேரி நேரடி நெல் கொள்முதல் மையம்', 'Tiruvallur', 'Ponneri', 'NH5 Ponneri Mandi Campus', 'கே. இரவிச்சந்திரன் (DPC Officer)', '9840123456'),
('dpc_tiruvarur', 'திருவாரூர் மார்க்கெட் கமிட்டி DPC', 'Tiruvarur', 'Tiruvarur', 'Central Paddy Procurement Yard, Tiruvarur', 'எம். சுந்தரம் (DPC Officer)', '9840654321')
ON CONFLICT (id) DO NOTHING;

-- Seed MSP Rates (Kharif 2025-26 TN Prices)
INSERT INTO msp_rates (id, crop_name_ta, crop_name_en, category, central_msp_per_qtl, tn_bonus_per_qtl, total_rate_per_qtl) VALUES
('whiteponni', 'வெள்ளை பொன்னி (White Ponni)', 'White Ponni (Grade-A)', 'fine', 2203.00, 107.00, 2310.00),
('co51', 'கோ 51 (Co 51)', 'Co 51 (Grade-A)', 'fine', 2203.00, 107.00, 2310.00),
('cr1009', 'சி.ஆர் 1009 (CR 1009)', 'CR 1009 (Fine)', 'fine', 2203.00, 107.00, 2310.00),
('aduthurai', 'அடுதுறை (Aduthurai)', 'Aduthurai (Common)', 'common', 2183.00, 82.00, 2265.00),
('koozha', 'கூழை நெல் (Kuzha Paddy)', 'Kuzha Paddy (Common)', 'common', 2183.00, 82.00, 2265.00)
ON CONFLICT (id) DO NOTHING;

-- Seed Demo Farmer Profile
INSERT INTO farmers (id, name, mobile, aadhaar_masked, ration_card_number, village, district, state, survey_number, patta_number, taluk, cultivated_acres, paddy_variety) VALUES
('farmer_001', 'முருகன் சுப்பையா', '9876543210', 'XXXX XXXX 1098', 'TN01 00123456', 'திருவாரூர்', 'திருவாரூர்', 'Tamil Nadu', '142/3A', 'PAT-45210', 'திருவாரூர் வட்டம்', 3.5, 'whiteponni')
ON CONFLICT (id) DO NOTHING;

-- Seed Demo Slot Booking
INSERT INTO slot_bookings (id, token_number, farmer_id, dpc_id, slot_date, slot_time, num_bags, crop_variety_id, estimated_quantity_qtl, estimated_total_amount, status) VALUES
('booking_001', 44, 'farmer_001', 'dpc_ponneri', CURRENT_DATE, '09:00 AM - 10:00 AM', 40, 'whiteponni', 16.0, 36960.00, 'booked')
ON CONFLICT (id) DO NOTHING;

-- Seed Demo Realtime Queue
INSERT INTO queue (token_number, farmer_id, dpc_id, booking_id, current_stage) VALUES
(44, 'farmer_001', 'dpc_ponneri', 'booking_001', 4)
ON CONFLICT DO NOTHING;
