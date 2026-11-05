-- =====================================================================
-- WSSND SKYLINK GLOBAL PORTAL (MADRID UE & DUBAI IFZA)
-- Esquema Completo de Base de Datos PostgreSQL para Supabase
-- Entidades:
--   1. WSSND SKYLINK CARGO GLOBAL, S.L. (NIF: B05861943 - Madrid, España)
--   2. WSSND Skylink General Trading FZCO (IFZA - Dubái, EAU)
-- =====================================================================

-- 1. Catálogo de Vehículos, Tractores, Maquinaria y Recambios
CREATE TABLE IF NOT EXISTS catalog_vehicles_machinery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    hub_origin TEXT NOT NULL CHECK (hub_origin IN ('DUBAI_IFZA', 'MADRID_ES', 'BOTH')),
    category TEXT NOT NULL CHECK (category IN ('NEW_VEHICLE', 'USED_VEHICLE', 'TRACTOR_AGRI', 'HEAVY_MACHINERY', 'COMMERCIAL_TRUCK', 'SPARE_PARTS')),
    title TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    manufacture_year INT,
    condition TEXT NOT NULL CHECK (condition IN ('NEW', 'USED', 'REFURBISHED')),
    mileage_or_hours TEXT,
    power_hp INT,
    export_restriction TEXT DEFAULT 'WORLDWIDE', -- Ej. 'OUTSIDE_UAE_ONLY' para licencia 4510084
    price_amount NUMERIC(12,2),
    currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'AED')),
    price_on_request BOOLEAN DEFAULT false,
    specs_json JSONB DEFAULT '{}'::jsonb,
    images_urls TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD'))
);

-- 2. Catálogo de Materias Primas y Comercio General (General Trading)
CREATE TABLE IF NOT EXISTS catalog_commodities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    hub_origin TEXT NOT NULL CHECK (hub_origin IN ('DUBAI_IFZA', 'MADRID_ES', 'BOTH')),
    sector TEXT NOT NULL CHECK (sector IN ('HYDROCARBONS', 'PRECIOUS_METALS', 'CONSTRUCTION_MATERIALS', 'AGRO_FOOD', 'GENERAL_MERCHANDISE')),
    product_name TEXT NOT NULL,
    technical_summary TEXT,
    min_order_quantity TEXT NOT NULL,
    available_incoterms TEXT[] DEFAULT ARRAY['FOB', 'CIF', 'EXW'],
    origin_region TEXT,
    spec_sheet_pdf_url TEXT,
    is_active BOOLEAN DEFAULT true
);

-- 3. Catálogo de Activos Inmobiliarios
CREATE TABLE IF NOT EXISTS catalog_real_estate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('INDUSTRIAL_WAREHOUSE', 'COMMERCIAL_RETAIL', 'RESIDENTIAL', 'LAND_PLOT', 'OFFICE')),
    operation_type TEXT NOT NULL CHECK (operation_type IN ('SALE', 'RENT', 'INVESTMENT')),
    country TEXT NOT NULL DEFAULT 'Spain',
    city_zone TEXT NOT NULL,
    area_sqm NUMERIC(10,2),
    price_amount NUMERIC(14,2),
    currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'AED')),
    estimated_yield_pct NUMERIC(5,2),
    images_urls TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNDER_OFFER', 'CLOSED'))
);

-- 4. Registro Centralizado de Leads, Cotizaciones (RFQ) y Búsquedas por Encargo
CREATE TABLE IF NOT EXISTS leads_rfq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    preferred_hub TEXT DEFAULT 'AUTO' CHECK (preferred_hub IN ('AUTO', 'DUBAI_IFZA', 'MADRID_ES')),
    division TEXT NOT NULL CHECK (division IN ('AUTOMOTIVE_MACHINERY', 'COMMODITIES_TRADING', 'LOGISTICS_SOURCING', 'REAL_ESTATE')),
    request_type TEXT NOT NULL, -- Ej. 'CATALOG_INQUIRY', 'CUSTOM_SOURCING', 'LOI_SUBMISSION', 'CALLBACK'
    related_item_id UUID,
    client_full_name TEXT NOT NULL,
    company_name TEXT,
    tax_or_license_id TEXT,
    email TEXT NOT NULL,
    phone_e164 TEXT NOT NULL,
    country TEXT NOT NULL,
    preferred_timezone TEXT,
    request_details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    attachment_file_url TEXT,
    lead_status TEXT DEFAULT 'NEW' CHECK (lead_status IN ('NEW', 'CONTACTED', 'PROFORMA_SENT', 'CLOSED_WON', 'ARCHIVED'))
);
