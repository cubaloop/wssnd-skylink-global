-- =====================================================================
-- WSSND SKYLINK GLOBAL PORTAL v7 (MADRID UE & DUBAI / AJMAN HUB)
-- Esquema Completo PostgreSQL para Supabase (Dual-Layer Sync)
-- Incluye: Catálogo White-Label (+5%), Usuarios, Atribución (?ref=),
-- Directorio Confidencial (Proveedores y Compradores) y Solicitudes de Catálogo
-- =====================================================================

-- 1. Usuarios Registrados (Compradores y Proveedores Externos)
CREATE TABLE IF NOT EXISTS wssnd_users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    role TEXT NOT NULL CHECK (role IN ('MASTER_ADMIN', 'BUYER', 'SUPPLIER')),
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    company_name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    products_or_interest TEXT,
    captured_by TEXT DEFAULT 'Se registró solo' CHECK (captured_by IN ('Benjamín', 'David', 'Se registró solo')),
    password_hash TEXT NOT NULL
);

-- 2. Directorio Privado de Proveedores (Exclusivo Benja & David)
CREATE TABLE IF NOT EXISTS wssnd_directory_suppliers (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    products TEXT,
    prices TEXT,
    closed_deals INT DEFAULT 0,
    captured_by TEXT DEFAULT 'David' CHECK (captured_by IN ('Benjamín', 'David', 'Se registró solo')),
    sector TEXT DEFAULT 'COMMODITIES',
    status TEXT DEFAULT 'Contactado'
);

-- 3. Directorio Privado de Compradores / Clientes (Exclusivo Benja & David)
CREATE TABLE IF NOT EXISTS wssnd_directory_buyers (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    company TEXT,
    contact TEXT,
    product_required TEXT NOT NULL,
    request_date TEXT NOT NULL,
    status TEXT DEFAULT 'Abierto' CHECK (status IN ('Abierto', 'Cerrado')),
    close_date TEXT DEFAULT '',
    total_amount NUMERIC(14,2) DEFAULT 0,
    profit_amount NUMERIC(14,2) DEFAULT 0,
    captured_by TEXT DEFAULT 'Se registró solo' CHECK (captured_by IN ('Benjamín', 'David', 'Se registró solo')),
    notes TEXT
);

-- 4. Solicitudes de Catálogo de Proveedores (Cola de Aprobación)
CREATE TABLE IF NOT EXISTS wssnd_supplier_submissions (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    supplier_user_id TEXT,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    captured_by TEXT DEFAULT 'Se registró solo',
    category TEXT DEFAULT 'COMMODITIES',
    hub_origin TEXT DEFAULT 'DUBAI_IFZA',
    product_title TEXT NOT NULL,
    net_price NUMERIC(14,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    unit_label TEXT,
    specs TEXT,
    image_data TEXT,
    catalog_doc_name TEXT,
    review_status TEXT DEFAULT 'PENDING_REVIEW' CHECK (review_status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED'))
);

-- 5. Catálogo Maestro con Control Privado de Margen (+5% por defecto)
CREATE TABLE IF NOT EXISTS wssnd_catalog_items (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    tab TEXT NOT NULL,
    hub_origin TEXT NOT NULL,
    hub_label TEXT,
    condition TEXT DEFAULT 'NEW',
    condition_label TEXT,
    title TEXT NOT NULL,
    base_currency TEXT DEFAULT 'EUR' CHECK (base_currency IN ('EUR', 'USD', 'AED')),
    supplier_ref TEXT,
    supplier_net_price NUMERIC(14,2) DEFAULT 0,
    commission_type TEXT DEFAULT 'PERCENT' CHECK (commission_type IN ('PERCENT', 'FIXED')),
    commission_value NUMERIC(14,2) DEFAULT 5,
    public_price NUMERIC(14,2) DEFAULT 0,
    unit_label TEXT,
    price_on_request BOOLEAN DEFAULT false,
    price_label TEXT,
    image TEXT,
    specs JSONB DEFAULT '[]'::jsonb,
    hidden BOOLEAN DEFAULT false
);

-- 6. Sincronización Dual-Layer KV (Respaldo Instantáneo)
CREATE TABLE IF NOT EXISTS wssnd_portal_kv (
    key TEXT PRIMARY KEY,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);
