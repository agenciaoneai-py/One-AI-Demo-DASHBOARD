import OpenAI from 'openai';
import supabase from '../config/supabase.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory conversation cache (per demo session — no need for long persistence)
const conversationCache = new Map();
const MAX_HISTORY = 20;

// ─── Tools (OpenAI function calling) ─────────────────────────────────────────

const DEMO_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_product',
      description: 'Buscar un producto en el inventario por nombre, categoría o descripción. Usa esto cuando el cliente pregunte por un producto específico, precios, o disponibilidad.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Término de búsqueda del producto' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_products_by_category',
      description: 'Listar todos los productos de una categoría específica. Usa cuando el cliente quiera ver opciones de una categoría.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Nombre de la categoría' },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_available_slots',
      description: 'Verificar horarios disponibles para agendar una cita en una fecha específica.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description: 'Crear una cita. SOLO usar cuando tengas TODOS los datos necesarios Y el cliente haya confirmado explícitamente.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Nombre del cliente' },
          customer_phone: { type: 'string', description: 'Teléfono del cliente' },
          service: { type: 'string', description: 'Servicio o motivo de la cita' },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
          time: { type: 'string', description: 'Hora HH:MM' },
        },
        required: ['customer_name', 'service', 'date', 'time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: 'Crear un pedido. SOLO usar cuando el cliente haya confirmado explícitamente los productos y cantidades.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Nombre del cliente' },
          customer_phone: { type: 'string', description: 'Teléfono' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_name: { type: 'string' },
                quantity: { type: 'number' },
                unit_price: { type: 'number' },
              },
              required: ['product_name', 'quantity', 'unit_price'],
            },
            description: 'Lista de productos del pedido',
          },
          delivery_type: { type: 'string', enum: ['delivery', 'pickup'], description: 'Tipo de entrega' },
          delivery_address: { type: 'string', description: 'Dirección si es delivery' },
        },
        required: ['customer_name', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_delivery',
      description: 'Calcular costo de delivery según la zona o dirección del cliente.',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Dirección del cliente' },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_human_handoff',
      description: 'Transferir la conversación a un humano. Usar cuando el cliente lo pida explícitamente o cuando la consulta exceda tus capacidades.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Motivo de la transferencia' },
          summary: { type: 'string', description: 'Resumen breve de la conversación' },
        },
        required: ['reason', 'summary'],
      },
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES_ES = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};

function formatStoreHours(hours) {
  return Object.entries(hours)
    .map(([day, config]) => {
      if (!config?.active) return `${DAY_NAMES_ES[day] || day}: Cerrado`;
      return `${DAY_NAMES_ES[day] || day}: ${config.open} - ${config.close}`;
    })
    .join('\n');
}

async function buildSystemPrompt(clientId) {
  // 1. Base prompt from agent_prompts
  const { data: promptRow } = await supabase
    .from('agent_prompts')
    .select('prompt_text')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();

  // 2. Client config
  const { data: client } = await supabase
    .from('clients')
    .select('business_name, agent_name, custom_fields, agent_config')
    .eq('id', clientId)
    .single();

  let prompt = promptRow?.prompt_text || 'Sos un asistente virtual amable y profesional.';
  const agentName = client?.agent_name || 'Agente';
  const businessName = client?.business_name || 'Negocio';

  // 3. Inject placeholders
  prompt = prompt.replaceAll('{{agentName}}', agentName);
  prompt = prompt.replaceAll('{{businessName}}', businessName);

  const config = client?.agent_config || {};

  // 4. Store hours
  if (config.storeHours && Object.keys(config.storeHours).length > 0) {
    prompt += `\n\n## Horarios del negocio\n${formatStoreHours(config.storeHours)}`;
  }

  // 5. FAQ
  if (Array.isArray(config.faq) && config.faq.length > 0) {
    prompt += `\n\n## Preguntas frecuentes\n${config.faq.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n')}`;
  }

  // 6. Special instructions
  if (Array.isArray(config.specialInstructions) && config.specialInstructions.length > 0) {
    const active = config.specialInstructions.filter(i => i.active);
    if (active.length > 0) {
      prompt += `\n\n## Instrucciones especiales\n${active.map(i => `- ${i.instruction}`).join('\n')}`;
    }
  }

  // 7. Current date/time (Asunción TZ)
  const now = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' });
  prompt += `\n\n## Fecha y hora actual\n${now} (Asunción, Paraguay)`;

  return prompt;
}

// ─── Tool execution ──────────────────────────────────────────────────────────

async function executeTool(toolName, args, clientId) {
  switch (toolName) {

    case 'search_product': {
      const query = String(args.query || '').trim();
      if (!query) return { found: false, message: 'No recibí un término de búsqueda.' };

      const like = `%${query}%`;
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, currency, stock_quantity, image_urls, seller_pitch')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .or(`name.ilike.${like},description.ilike.${like}`)
        .limit(5);

      if (error) return { found: false, error: error.message };
      if (!data || data.length === 0) {
        return { found: false, message: 'No encontré productos con esa búsqueda.' };
      }

      return {
        found: true,
        products: data.map(p => ({
          name: p.name,
          price: p.price,
          price_note: (!p.price || Number(p.price) === 0) ? 'Precio a cotizar — consultar con asesor comercial' : null,
          currency: p.currency || 'Gs',
          stock: p.stock_quantity,
          description: p.description,
          seller_pitch: p.seller_pitch,
          image_url: p.image_urls?.[0] || null,
        })),
      };
    }

    case 'list_products_by_category': {
      const cat = String(args.category || '').trim();

      // Try to find a category first
      const { data: categories } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('client_id', clientId)
        .ilike('name', `%${cat}%`)
        .limit(1);

      if (!categories || categories.length === 0) {
        // Fallback: full catalog
        const { data: allProducts } = await supabase
          .from('products')
          .select('name, price, currency, stock_quantity, image_urls, description')
          .eq('client_id', clientId)
          .eq('is_active', true)
          .limit(20);

        return {
          category: null,
          message: 'No encontré esa categoría exacta. Acá tenés el catálogo completo:',
          products: (allProducts || []).map(p => ({
            name: p.name,
            price: p.price,
            price_note: (!p.price || Number(p.price) === 0) ? 'Precio a cotizar — consultar con asesor comercial' : null,
            currency: p.currency || 'Gs',
            stock: p.stock_quantity,
            description: p.description,
            image_url: p.image_urls?.[0] || null,
          })),
        };
      }

      const { data: products } = await supabase
        .from('products')
        .select('name, description, price, currency, stock_quantity, image_urls, seller_pitch')
        .eq('client_id', clientId)
        .eq('category_id', categories[0].id)
        .eq('is_active', true)
        .limit(10);

      return {
        category: categories[0].name,
        products: (products || []).map(p => ({
          name: p.name,
          price: p.price,
          price_note: (!p.price || Number(p.price) === 0) ? 'Precio a cotizar — consultar con asesor comercial' : null,
          currency: p.currency || 'Gs',
          stock: p.stock_quantity,
          description: p.description,
          seller_pitch: p.seller_pitch,
          image_url: p.image_urls?.[0] || null,
        })),
      };
    }

    case 'check_available_slots': {
      const date = String(args.date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { available: false, message: 'Necesito una fecha en formato YYYY-MM-DD.' };
      }

      const { data: client } = await supabase
        .from('clients')
        .select('agent_config')
        .eq('id', clientId)
        .single();

      const config = client?.agent_config || {};
      const storeHours = config.storeHours || {};
      const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayConfig = storeHours[dayOfWeek];

      if (!dayConfig || !dayConfig.active) {
        return {
          available: false,
          message: `El negocio no atiende los ${DAY_NAMES_ES[dayOfWeek]?.toLowerCase() || dayOfWeek}.`,
        };
      }

      // Already-booked slots that day
      const { data: existing } = await supabase
        .from('demo_appointments')
        .select('time')
        .eq('client_id', clientId)
        .eq('date', date)
        .neq('status', 'cancelled');

      const bookedTimes = (existing || []).map(a => String(a.time).substring(0, 5));

      // Generate hourly slots between open and close
      const openHour = parseInt(dayConfig.open.split(':')[0], 10);
      const closeHour = parseInt(dayConfig.close.split(':')[0], 10);
      const slots = [];
      for (let h = openHour; h < closeHour; h++) {
        const slot = `${String(h).padStart(2, '0')}:00`;
        if (!bookedTimes.includes(slot)) slots.push(slot);
      }

      return {
        available: slots.length > 0,
        date,
        day: DAY_NAMES_ES[dayOfWeek] || dayOfWeek,
        hours: `${dayConfig.open} - ${dayConfig.close}`,
        available_slots: slots,
        booked_count: bookedTimes.length,
      };
    }

    case 'create_appointment': {
      const { data, error } = await supabase
        .from('demo_appointments')
        .insert({
          client_id: clientId,
          customer_name: args.customer_name,
          customer_phone: args.customer_phone || null,
          service: args.service,
          date: args.date,
          time: args.time,
          status: 'scheduled',
          platform: 'demo',
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      return {
        success: true,
        appointment: {
          id: data.id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          service: data.service,
          date: data.date,
          time: String(data.time).substring(0, 5),
          status: data.status,
        },
      };
    }

    case 'create_order': {
      const items = Array.isArray(args.items) ? args.items : [];
      const totalAmount = items.reduce(
        (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
        0,
      );

      const { data, error } = await supabase
        .from('demo_orders')
        .insert({
          client_id: clientId,
          customer_name: args.customer_name,
          customer_phone: args.customer_phone || null,
          items,
          total_amount: totalAmount,
          currency: 'Gs',
          delivery_type: args.delivery_type || 'pickup',
          delivery_address: args.delivery_address || null,
          status: 'pending_confirmation',
          platform: 'demo',
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      return {
        success: true,
        order: {
          id: data.id,
          customer_name: data.customer_name,
          items: data.items,
          total: totalAmount,
          currency: 'Gs',
          delivery_type: data.delivery_type,
          delivery_address: data.delivery_address,
          status: data.status,
        },
      };
    }

    case 'calculate_delivery': {
      const { data: zones } = await supabase
        .from('delivery_zones')
        .select('zone_name, price, is_active')
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (!zones || zones.length === 0) {
        return { available: false, message: 'No hay zonas de delivery configuradas.' };
      }

      const address = String(args.address || '').toLowerCase();
      const matchedZone = zones.find(z => address.includes(z.zone_name.toLowerCase()));

      if (matchedZone) {
        return {
          available: true,
          zone: matchedZone.zone_name,
          price: matchedZone.price,
          currency: 'Gs',
        };
      }

      return {
        available: true,
        message: 'No pude determinar la zona exacta. Estas son las zonas disponibles:',
        zones: zones.map(z => ({ name: z.zone_name, price: z.price })),
      };
    }

    case 'request_human_handoff': {
      // For the demo we just acknowledge — no real handoff queue
      return {
        success: true,
        message: 'Conversación transferida a un agente humano.',
        reason: args.reason,
        summary: args.summary,
      };
    }

    default:
      return { error: `Tool desconocida: ${toolName}` };
  }
}

// ─── Cache management ────────────────────────────────────────────────────────

export function clearConversationCache(userId) {
  conversationCache.delete(userId);
}

export function clearAllConversationCache() {
  conversationCache.clear();
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export async function handleDemoChat(userId, message, platform = 'demo', imageUrl = null) {
  try {
    // 1. Pick the (single) demo client
    const { data: clientRow, error: clientErr } = await supabase
      .from('clients')
      .select('id')
      .limit(1)
      .single();

    if (clientErr || !clientRow) {
      throw new Error('No hay cliente configurado en la BD. Corré el setup primero.');
    }
    const clientId = clientRow.id;

    // 2. Build dynamic system prompt
    const systemPrompt = await buildSystemPrompt(clientId);

    // 3. Get conversation history
    let history = conversationCache.get(userId) || [];

    // 4. Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-MAX_HISTORY),
    ];

    // 5. Append user message (with image if present)
    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Te envío esta imagen.' },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // 6. First GPT call with tools (vision needs gpt-4o)
    const firstResponse = await openai.chat.completions.create({
      model: imageUrl ? 'gpt-4o' : 'gpt-4.1',
      messages,
      tools: DEMO_TOOLS,
      tool_choice: 'auto',
      temperature: 0.85,
      max_tokens: 250,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
    });

    const firstMessage = firstResponse.choices[0].message;
    let finalResponse = firstMessage.content;
    let productsToShow = [];
    let appointmentCreated = null;
    let orderCreated = null;

    // 7. Execute tool calls if present
    if (firstMessage.tool_calls && firstMessage.tool_calls.length > 0) {
      messages.push(firstMessage);

      for (const toolCall of firstMessage.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          console.error('Error parsing tool args:', e);
        }

        const result = await executeTool(toolCall.function.name, args, clientId);

        // Extract structured outputs for the UI
        if (Array.isArray(result.products) && result.products.length > 0) {
          const withImages = result.products.filter(p => p.image_url);
          if (withImages.length > 0) productsToShow = withImages;
        }
        if (result.appointment) appointmentCreated = result.appointment;
        if (result.order) orderCreated = result.order;

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // 8. Second GPT call with tool results
      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages,
        temperature: 0.85,
        max_tokens: 250,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
      });

      finalResponse = secondResponse.choices[0].message.content;
    }

    // Safety net — never return null/empty
    if (!finalResponse) {
      finalResponse = 'Disculpá, no pude procesar tu mensaje. ¿Podés repetirlo?';
    }

    // 9. Update in-memory history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: finalResponse });
    if (history.length > MAX_HISTORY * 2) {
      history = history.slice(-MAX_HISTORY * 2);
    }
    conversationCache.set(userId, history);

    // 10. Persist to Supabase (fire-and-forget)
    supabase
      .from('demo_conversations')
      .insert([
        { client_id: clientId, user_id: userId, role: 'user', content: message },
        { client_id: clientId, user_id: userId, role: 'assistant', content: finalResponse },
      ])
      .then(({ error }) => {
        if (error) console.error('Error saving conversation:', error.message);
      });

    // 11. Return structured payload
    return {
      response: finalResponse,
      products: productsToShow,
      appointment: appointmentCreated,
      order: orderCreated,
    };

  } catch (error) {
    console.error('Error in handleDemoChat:', error);
    return {
      response: 'Disculpá, tuve un problema técnico. ¿Podés repetir tu mensaje?',
      products: [],
      appointment: null,
      order: null,
    };
  }
}
