-- backend/init_db.sql
-- Initialize Montgomery Guardian database schema

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create crime_incidents table
CREATE TABLE IF NOT EXISTS crime_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(50) UNIQUE,
    incident_type VARCHAR(100) NOT NULL,
    description TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    geometry GEOMETRY(POINT, 4326),
    incident_date TIMESTAMP NOT NULL,
    reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    district VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'investigating')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on geometry for spatial queries
CREATE INDEX IF NOT EXISTS idx_crime_incidents_geometry ON crime_incidents USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_date ON crime_incidents (incident_date);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_type ON crime_incidents (incident_type);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_district ON crime_incidents (district);

-- Create service_requests_311 table
CREATE TABLE IF NOT EXISTS service_requests_311 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(50) UNIQUE,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    geometry GEOMETRY(POINT, 4326),
    request_date TIMESTAMP NOT NULL,
    reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    district VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
    estimated_resolution_days INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on geometry for spatial queries
CREATE INDEX IF NOT EXISTS idx_service_requests_geometry ON service_requests_311 USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_service_requests_date ON service_requests_311 (request_date);
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests_311 (service_type);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests_311 (status);

-- Create function to update geometry from lat/lng
CREATE OR REPLACE FUNCTION update_geometry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
        NEW.geometry = ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update geometry
CREATE TRIGGER update_crime_geometry
    BEFORE INSERT OR UPDATE ON crime_incidents
    FOR EACH ROW EXECUTE FUNCTION update_geometry();

CREATE TRIGGER update_service_geometry
    BEFORE INSERT OR UPDATE ON service_requests_311
    FOR EACH ROW EXECUTE FUNCTION update_geometry();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update timestamp
CREATE TRIGGER update_crime_timestamp
    BEFORE UPDATE ON crime_incidents
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_service_timestamp
    BEFORE UPDATE ON service_requests_311
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Insert sample data for testing (will be replaced by ETL)
INSERT INTO crime_incidents (incident_id, incident_type, description, location_lat, location_lng, incident_date, district, severity) VALUES
('MCPD-2024-001', 'Assault', 'Simple assault reported downtown', 32.3617, -86.2792, NOW() - INTERVAL '2 days', 'Downtown', 'medium'),
('MCPD-2024-002', 'Burglary', 'Residential burglary in progress', 32.3520, -86.2850, NOW() - INTERVAL '1 day', 'Old Cloverdale', 'high'),
('MCPD-2024-003', 'Theft', 'Petty theft from vehicle', 32.3750, -86.2600, NOW() - INTERVAL '3 hours', 'Capitol Heights', 'low');

INSERT INTO service_requests_311 (request_id, service_type, description, location_lat, location_lng, request_date, district, priority) VALUES
('311-2024-001', 'Pothole Repair', 'Large pothole on main street', 32.3617, -86.2792, NOW() - INTERVAL '1 day', 'Downtown', 'high'),
('311-2024-002', 'Trash Collection', 'Missed trash collection', 32.3520, -86.2850, NOW() - INTERVAL '2 days', 'Old Cloverdale', 'normal'),
('311-2024-003', 'Graffiti Removal', 'Graffiti on public wall', 32.3750, -86.2600, NOW() - INTERVAL '4 hours', 'Capitol Heights', 'low');

-- Create views for common queries
CREATE OR REPLACE VIEW v_active_crimes AS
SELECT * FROM crime_incidents 
WHERE status = 'open' 
AND incident_date >= NOW() - INTERVAL '30 days';

CREATE OR REPLACE VIEW v_open_311_requests AS
SELECT * FROM service_requests_311 
WHERE status IN ('open', 'in_progress');

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

COMMIT;
