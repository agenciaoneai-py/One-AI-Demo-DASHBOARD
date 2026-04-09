-- ============================================================================
-- fix-schema.sql — Reconciliación schema real ↔ código nuevo (demo-agent)
-- ============================================================================
--
-- CONTEXTO:
-- Después de inspeccionar el schema real con `node scripts/check-schema.js`,
-- la mayoría de columnas que el código nuevo necesita YA EXISTEN en Supabase
-- (clients.agent_name, clients.custom_fields, clients.agent_config, etc).
--
-- Los errores reportados ("Could not find the 'agent_name' column") fueron
-- causados por el SCHEMA CACHE de PostgREST que estaba stale después de los
-- ALTERs anteriores. Este archivo refresca el cache + agrega defensas
-- defensivas para que las tres columnas NOT NULL sin default no rompan
-- futuros INSERTs.
--
-- USO:
-- Ejecutar este SQL desde el SQL Editor de Supabase. Es idempotente — se
-- puede correr varias veces sin efecto secundario.
--
-- NO TOCA datos existentes. Solo metadata de columnas.
-- ============================================================================


-- ── 1. clients.industry: NOT NULL sin default → agregar default 'demo' ─────
--
-- El UPDATE en demo-setup.js no toca esta columna (ya tiene valor en filas
-- existentes), pero si algún día se crea un cliente nuevo desde el código,
-- el INSERT fallaría sin este default.

ALTER TABLE clients
  ALTER COLUMN industry SET DEFAULT 'demo';


-- ── 2. agent_prompts.industry: NOT NULL sin default → agregar default ──────
--
-- Cuando demo-setup.js inserta un prompt nuevo (porque no existía uno activo),
-- el INSERT no incluía industry y fallaba. Le ponemos default 'demo'.
-- (Adicional: el código ahora también pasa industry explícitamente.)

ALTER TABLE agent_prompts
  ALTER COLUMN industry SET DEFAULT 'demo';


-- ── 3. products.sku: NOT NULL sin default — OPCIÓN A: dejar como está ──────
--
-- El código ahora genera SKU automático en demo-setup.js (formato SKU-001,
-- SKU-002, etc). NO necesitamos cambiar el schema. La columna sigue NOT NULL
-- como protección de integridad.
--
-- Si en el futuro querés que los INSERTs no necesiten SKU, descomentá:
--
-- ALTER TABLE products
--   ALTER COLUMN sku SET DEFAULT ('SKU-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));


-- ── 4. Forzar reload del schema cache de PostgREST ─────────────────────────
--
-- Esto resuelve los errores tipo "Could not find the 'X' column" que aparecen
-- cuando una columna fue agregada por SQL pero PostgREST aún no la vio.
-- DESPUÉS DE CORRER ESTE ARCHIVO, los errores de columna desaparecen.

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN (opcional, copiá y pegá una a una):
-- ============================================================================

-- 1) Confirmar que clients tiene las columnas esperadas:
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'clients' AND table_schema = 'public'
--   ORDER BY ordinal_position;

-- 2) Confirmar que agent_prompts.industry ahora tiene default:
--   SELECT column_default FROM information_schema.columns
--   WHERE table_name = 'agent_prompts' AND column_name = 'industry';

-- 3) Confirmar que products.sku sigue NOT NULL (no debe haber cambiado):
--   SELECT is_nullable FROM information_schema.columns
--   WHERE table_name = 'products' AND column_name = 'sku';
