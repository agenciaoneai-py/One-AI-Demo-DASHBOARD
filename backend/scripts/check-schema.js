// Inspecciona el schema REAL de Supabase usando el spec OpenAPI de PostgREST.
// Imprime, por cada tabla de interés, sus columnas con tipo y nullability.
//
// Uso: node scripts/check-schema.js

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
  process.exit(1);
}

const TABLES_OF_INTEREST = [
  'clients',
  'products',
  'product_categories',
  'agent_prompts',
  'contacts',
  'contact_tags',
  'delivery_zones',
  'demo_appointments',
  'demo_orders',
  'demo_conversations',
];

async function fetchOpenApiSpec() {
  const url = `${SUPABASE_URL}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: 'application/openapi+json',
    },
  });
  if (!res.ok) {
    throw new Error(`OpenAPI fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function inspectViaSelect(table) {
  // Fallback: pull 1 row and inspect keys
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    return { error: `${res.status} ${res.statusText}` };
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    return { error: 'no rows — cannot infer columns from data' };
  }
  return { columns: Object.keys(data[0]), sampleRow: data[0] };
}

function summarizeTable(spec, table) {
  // PostgREST OpenAPI puts table definitions under definitions[table] (Swagger 2)
  // OR components.schemas[table] (OpenAPI 3) — Supabase uses Swagger 2
  const def = spec?.definitions?.[table];
  if (!def || !def.properties) return null;

  const required = new Set(def.required || []);
  const cols = Object.entries(def.properties).map(([name, props]) => ({
    name,
    type: props.format || props.type || '?',
    nullable: !required.has(name),
    default: props.default,
    description: props.description,
  }));
  return cols;
}

async function main() {
  console.log('🔍 Inspecting Supabase schema via PostgREST OpenAPI spec\n');
  console.log(`URL: ${SUPABASE_URL}\n`);

  let spec;
  try {
    spec = await fetchOpenApiSpec();
  } catch (e) {
    console.error('❌ Could not fetch OpenAPI spec:', e.message);
    spec = null;
  }

  for (const table of TABLES_OF_INTEREST) {
    console.log(`\n${'='.repeat(72)}`);
    console.log(`📋 ${table}`);
    console.log('='.repeat(72));

    let cols = spec ? summarizeTable(spec, table) : null;

    if (!cols) {
      console.log('  (not in OpenAPI spec — falling back to SELECT)');
      const fallback = await inspectViaSelect(table);
      if (fallback.error) {
        console.log(`  ⚠️  ${fallback.error}`);
        continue;
      }
      cols = fallback.columns.map(c => ({
        name: c,
        type: typeof fallback.sampleRow[c],
        nullable: '?',
        default: undefined,
      }));
    }

    // Pretty print
    const colWidth = Math.max(...cols.map(c => c.name.length), 4);
    cols.forEach(c => {
      const nullMark = c.nullable === true ? 'NULL' : c.nullable === false ? 'NOT NULL' : '?';
      const defaultMark = c.default !== undefined ? ` DEFAULT ${JSON.stringify(c.default)}` : '';
      console.log(`  ${c.name.padEnd(colWidth)}  ${String(c.type).padEnd(20)}  ${nullMark}${defaultMark}`);
    });
  }

  console.log('\n✅ Schema inspection complete');
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
