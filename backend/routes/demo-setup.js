import express from 'express';
import supabase from '../config/supabase.js';
import { seedFakeData } from '../services/seed-data.js';
import { CLIENT_CONFIG } from '../config/client-config.js';
import { invalidateStatsCache } from '../services/fake-data.js';
import { clearAllConversationCache } from '../agents/demo-agent.js';

const router = express.Router();

// POST /api/demo/setup — Configurar el demo completo para un cliente
router.post('/setup', async (req, res) => {
  const {
    businessName,
    agentName,
    agentRole = 'Asesora de ventas',
    logoUrl = '',
    systemPrompt,
    products = [],
    features = {},
    agentConfig = {}
  } = req.body;

  if (!businessName || !agentName || !systemPrompt) {
    return res.status(400).json({
      success: false,
      error: 'Campos requeridos: businessName, agentName, systemPrompt'
    });
  }

  console.log(`\n🔧 === SETUP DEMO: ${businessName} ===`);

  try {
    // --- STEP 1: Get or create client ---
    let { data: client } = await supabase
      .from('clients')
      .select('id')
      .limit(1)
      .single();

    if (!client) {
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          business_name: businessName,
          industry: 'demo',  // NOT NULL en el schema real
        })
        .select('id')
        .single();
      if (createError) throw new Error(`Error creando cliente: ${createError.message}`);
      client = newClient;
    }

    const clientId = client.id;

    // --- STEP 2: Update client record ---
    const mergedFeatures = {
      multiChannel: true,
      inventory: true,
      crm: true,
      orders: false,
      appointments: false,
      delivery: false,
      ...features
    };

    // Merge agentConfig with sensible defaults
    const mergedAgentConfig = {
      storeHours: agentConfig.storeHours || {},
      deliveryZones: agentConfig.deliveryZones || [],
      faq: agentConfig.faq || [],
      specialInstructions: agentConfig.specialInstructions || []
    };

    const { error: clientError } = await supabase
      .from('clients')
      .update({
        business_name: businessName,
        agent_name: agentName,
        custom_fields: {
          agent_role: agentRole,
          logo_url: logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&background=6366f1&color=fff`,
          features: mergedFeatures,
          last_setup: new Date().toISOString()
        },
        agent_config: mergedAgentConfig
      })
      .eq('id', clientId);

    if (clientError) throw new Error(`Error actualizando cliente: ${clientError.message}`);
    console.log('  ✅ Cliente actualizado (incluye agent_config)');

    // --- STEP 3: Update agent prompt ---
    // Try update first, insert if none exists
    const { data: existingPrompt } = await supabase
      .from('agent_prompts')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (existingPrompt) {
      const { error: promptError } = await supabase
        .from('agent_prompts')
        .update({ prompt_text: systemPrompt })
        .eq('id', existingPrompt.id);
      if (promptError) throw new Error(`Error actualizando prompt: ${promptError.message}`);
    } else {
      const { error: promptError } = await supabase
        .from('agent_prompts')
        .insert({
          client_id: clientId,
          prompt_text: systemPrompt,
          industry: 'demo',  // NOT NULL en el schema real
          is_active: true
        });
      if (promptError) throw new Error(`Error insertando prompt: ${promptError.message}`);
    }
    console.log('  ✅ Prompt del agente actualizado');

    // --- STEP 4: Clean and re-seed products ---
    // Delete existing products
    const { error: delProductsError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    if (delProductsError) throw new Error(`Error limpiando productos: ${delProductsError.message}`);

    // Resolve category IDs — create categories if needed
    const categoryMap = new Map();
    for (const p of products) {
      if (p.category && !categoryMap.has(p.category)) {
        // Check if category exists
        let { data: existingCat } = await supabase
          .from('product_categories')
          .select('id')
          .eq('name', p.category)
          .single();

        if (!existingCat) {
          const { data: newCat, error: catError } = await supabase
            .from('product_categories')
            .insert({
              name: p.category,
              client_id: clientId,
              search_keywords: [p.category.toLowerCase()],
              is_active: true
            })
            .select('id')
            .single();
          if (catError) {
            console.error(`  ⚠️ Error creando categoría ${p.category}:`, catError.message);
            continue;
          }
          existingCat = newCat;
        }
        categoryMap.set(p.category, existingCat.id);
      }
    }

    // Insert new products
    if (products.length > 0) {
      // SKU autogenerado: products.sku es NOT NULL en el schema real.
      // Formato: SKU-001, SKU-002, ...
      const productRows = products.map((p, idx) => ({
        sku: `SKU-${String(idx + 1).padStart(3, '0')}`,
        name: p.name,
        price: p.price,
        currency: p.currency || 'Gs',
        description: p.description || '',
        seller_pitch: p.description || '',
        stock_quantity: p.stock ?? 10,
        category: p.category || null,         // legacy text column
        category_id: categoryMap.get(p.category) || null,
        image_urls: p.image_url ? [p.image_url] : [],
        tags: p.tags || [],
        is_active: true,
        client_id: clientId
      }));

      const { error: insertProductsError } = await supabase
        .from('products')
        .insert(productRows);

      if (insertProductsError) throw new Error(`Error insertando productos: ${insertProductsError.message}`);
    }
    console.log(`  ✅ ${products.length} productos insertados`);

    // --- STEP 5: Clean previous demo data ---
    // Delete contact tags first (FK dependency)
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id');

    if (existingContacts && existingContacts.length > 0) {
      const contactIds = existingContacts.map(c => c.id);
      await supabase
        .from('contact_tags')
        .delete()
        .in('contact_id', contactIds);
    }

    // Delete contacts
    await supabase
      .from('contacts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    console.log('  ✅ Datos anteriores limpiados');

    // --- STEP 6: Seed fake contacts ---
    const seedResult = await seedFakeData(businessName, agentName);
    console.log(`  ✅ ${seedResult.contactsInserted} contactos demo creados`);

    // --- STEP 6.5: Re-seed delivery zones ---
    await supabase
      .from('delivery_zones')
      .delete()
      .eq('client_id', clientId);

    const zoneRows = (mergedAgentConfig.deliveryZones || [])
      .filter(z => z && z.zone_name && z.price != null)
      .map(z => ({
        client_id: clientId,
        zone_name: z.zone_name,
        price: Number(z.price),
        is_active: true
      }));

    if (zoneRows.length > 0) {
      const { error: zonesError } = await supabase
        .from('delivery_zones')
        .insert(zoneRows);
      if (zonesError) {
        console.warn('  ⚠️ Error insertando delivery zones:', zonesError.message);
      } else {
        console.log(`  ✅ ${zoneRows.length} zonas de delivery cargadas`);
      }
    }

    // --- STEP 7: Update in-memory client config ---
    CLIENT_CONFIG.businessName = businessName;
    CLIENT_CONFIG.ownerName = req.body.ownerName || businessName;
    CLIENT_CONFIG.ownerEmail = req.body.ownerEmail || 'demo@oneai.com';
    CLIENT_CONFIG.logoUrl = logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&background=6366f1&color=fff`;
    CLIENT_CONFIG.features = {
      ...CLIENT_CONFIG.features,
      ...mergedFeatures
    };

    // --- STEP 8: Invalidate caches ---
    invalidateStatsCache();
    clearAllConversationCache();

    console.log(`🔧 === SETUP COMPLETO ===\n`);

    res.json({
      success: true,
      message: `Demo configurado para ${businessName}`,
      summary: {
        businessName,
        agentName,
        agentRole,
        productsInserted: products.length,
        contactsSeeded: seedResult.contactsInserted,
        deliveryZones: (mergedAgentConfig.deliveryZones || []).length,
        features: mergedFeatures
      }
    });

  } catch (error) {
    console.error('❌ Error en setup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/demo/setup/status — Estado actual de la configuración del demo
router.get('/setup/status', async (req, res) => {
  try {
    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('business_name, agent_name, custom_fields')
      .limit(1)
      .single();

    // Count products
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Count contacts
    const { count: contactCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      data: {
        businessName: client?.business_name || 'No configurado',
        agentName: client?.agent_name || 'No configurado',
        productCount: productCount || 0,
        contactCount: contactCount || 0,
        features: client?.custom_fields?.features || {},
        lastSetup: client?.custom_fields?.last_setup || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
