-- ============================================================
-- ServiCasa — Supabase / PostgreSQL Schema
-- Run this in your Supabase SQL Editor to set up the database
-- ============================================================

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'contractor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CONTRACTORS
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  trade TEXT NOT NULL,
  city TEXT NOT NULL,
  rating NUMERIC(3,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  job_count INT DEFAULT 0,
  years_exp INT DEFAULT 0,
  rate_per_hour INT NOT NULL DEFAULT 0,
  available BOOLEAN DEFAULT true,
  bio TEXT,
  phone TEXT,
  badges TEXT[] DEFAULT ARRAY['Nuevo'],
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- JOBS
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  budget INT,
  urgency TEXT DEFAULT 'Esta semana',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  bid_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BIDS
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  contractor_name TEXT NOT NULL,
  amount INT NOT NULL,
  message TEXT,
  estimated_days INT DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, contractor_id)
);

-- REVIEWS
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- INDEXES for fast queries
-- ─────────────────────────────────────────
CREATE INDEX idx_contractors_city ON contractors(city);
CREATE INDEX idx_contractors_trade ON contractors(trade);
CREATE INDEX idx_contractors_available ON contractors(available);
CREATE INDEX idx_jobs_city ON jobs(city);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_bids_job_id ON bids(job_id);
CREATE INDEX idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX idx_reviews_contractor_id ON reviews(contractor_id);

-- ─────────────────────────────────────────
-- TRIGGER: auto-update contractor rating after new review
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_contractor_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contractors SET
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM reviews WHERE contractor_id = NEW.contractor_id
    ),
    review_count = (
      SELECT COUNT(*) FROM reviews WHERE contractor_id = NEW.contractor_id
    )
  WHERE id = NEW.contractor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_contractor_rating();

-- ─────────────────────────────────────────
-- TRIGGER: auto-update job bid_count
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_job_bid_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs SET bid_count = (
    SELECT COUNT(*) FROM bids WHERE job_id = NEW.job_id
  ) WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bid_count
AFTER INSERT ON bids
FOR EACH ROW EXECUTE FUNCTION update_job_bid_count();

-- ─────────────────────────────────────────
-- SEED DATA — sample contractors
-- ─────────────────────────────────────────
INSERT INTO contractors (name, initials, trade, city, rating, review_count, job_count, years_exp, rate_per_hour, available, bio, badges, verified) VALUES
('Mario Restrepo', 'MR', 'Pintura', 'Bogotá', 4.9, 47, 127, 5, 85000, true, 'Pintor profesional con más de 5 años de experiencia en interiores y exteriores.', ARRAY['Verificado', 'Top Rated'], true),
('Sofía Vargas', 'SV', 'Limpieza Profunda', 'Medellín', 4.8, 62, 203, 4, 65000, true, 'Especialista en limpieza de hogares y oficinas con métodos ecológicos.', ARRAY['Verificada', 'Disponible Hoy'], true),
('Juan Ospina', 'JO', 'Carpintería', 'Bogotá', 4.7, 31, 88, 7, 95000, true, 'Carpintero con 7 años fabricando muebles a medida, closets y cocinas.', ARRAY['Verificado'], true),
('Camila Ríos', 'CR', 'Drywall & Reparaciones', 'Cali', 4.9, 28, 54, 3, 75000, true, 'Técnica en drywall y reparaciones generales. Trabajo limpio y a tiempo.', ARRAY['Verificada'], true);
