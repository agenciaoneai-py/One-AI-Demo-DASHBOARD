import OpenAI from 'openai';
import supabase from '../config/supabase.js';
import { getClientConfig } from '../config/client-config.js';

// Función para obtener el prompt desde Supabase
async function getAgentPrompt(clientId) {
  try {
    const { data, error } = await supabase
      .from('agent_prompts')
      .select('prompt_text')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data?.prompt_text || 'Sos un asistente virtual.';
  } catch (error) {
    console.error('Error obteniendo prompt:', error);
    return 'Sos un asistente virtual.';
  }
}

// Función para buscar productos en el inventario
// Función mejorada para buscar productos con categorías
async function searchProducts(query, limit = 5) {
  try {
    // Buscar primero en categorías
    const { data: categories } = await supabase
      .from('product_categories')
      .select('id, name, search_keywords')
      .eq('is_active', true);

    let matchedCategoryIds = [];
    
    // Encontrar categorías que coincidan con la búsqueda
    if (categories) {
      const queryLower = query.toLowerCase();
      categories.forEach(cat => {
        const keywords = cat.search_keywords || [];
        const nameMatch = cat.name.toLowerCase().includes(queryLower);
        const keywordMatch = keywords.some(kw => queryLower.includes(kw.toLowerCase()));
        
        if (nameMatch || keywordMatch) {
          matchedCategoryIds.push(cat.id);
        }
      });
    }

    // Construir query de productos
    let productsQuery = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, description)
      `)
      .eq('is_active', true)
      .gt('stock_quantity', 0);

    // Si encontramos categorías, buscar por ellas
    if (matchedCategoryIds.length > 0) {
      productsQuery = productsQuery.in('category_id', matchedCategoryIds);
    } else {
      // Si no, buscar en nombre, descripción, tags y keywords
      const searchTerm = `%${query}%`;
      productsQuery = productsQuery.or(
        `name.ilike."${searchTerm}",` +
        `description.ilike."${searchTerm}",` +
        `tags.cs.{${query}},` +
        `search_keywords.cs.{${query}}`
      );
    }

    const { data: products, error } = await productsQuery.limit(limit);

    if (error) {
      console.error('Error en búsqueda de productos:', error);
      return [];
    }

    return products || [];
  } catch (error) {
    console.error('Error buscando productos:', error);
    return [];
  }
}

// Función para obtener zonas de delivery
async function getDeliveryZones(clientId) {
  try {
    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo zonas de delivery:', error);
    return [];
  }
}

export async function generateAgentResponse(conversationHistory, userMessage, clientId) {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const clientConfig = getClientConfig();
  
  // Obtener prompt personalizado desde Supabase
  const basePrompt = await getAgentPrompt(clientId);

  // SIEMPRE buscar productos en cada mensaje
  // El GPT es inteligente y solo los mencionará cuando sea relevante
  const foundProducts = await searchProducts(userMessage);

  let additionalContext = '';

  if (foundProducts.length > 0) {
  additionalContext += `\n\n# PRODUCTOS ENCONTRADOS EN INVENTARIO:\n`;
  additionalContext += `(Mostrá estos productos al cliente con entusiasmo)\n\n`;
  
  foundProducts.forEach(p => {
    const categoryPath = p.category?.name || p.category;
    
    additionalContext += `📍 ${categoryPath}\n`;
    additionalContext += `• ${p.name}\n`;
    additionalContext += `  💰 Precio: ${p.price.toLocaleString('es-PY')} ${p.currency === 'USD' ? 'USD' : 'Gs'}\n`;
    additionalContext += `  📦 Stock: ${p.stock_quantity} disponibles\n`;
    
    if (p.seller_pitch) {
      additionalContext += `  💡 Info: ${p.seller_pitch}\n`;
    }
    
    if (p.tags && p.tags.length > 0) {
      additionalContext += `  🏷️ Tags: ${p.tags.join(', ')}\n`;
    }
    
    additionalContext += `\n`;
  });
  
  additionalContext += `IMPORTANTE: Mencioná estos productos y decí "Te envío las fotos". Las imágenes se enviarán automáticamente.\n`;
}

  // SIEMPRE agregar zonas de delivery
  const zones = await getDeliveryZones(clientId);
  if (zones.length > 0) {
    additionalContext += `\n# ZONAS DE DELIVERY:\n`;
    zones.forEach(z => {
      additionalContext += `- ${z.zone_name}: ${z.price.toLocaleString('es-PY')} Gs\n`;
    });
  }

  const messages = [
    { role: 'system', content: basePrompt + additionalContext },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 200,
      presence_penalty: 0.6,
      frequency_penalty: 0.6,
    });
    
    return {
      text: response.choices[0].message.content,
      products: foundProducts
    };
  } catch (error) {
    console.error('❌ Error generando respuesta:', error);
    throw error;
  }
}

export function analyzeLeadQuality(conversationHistory) {
  return {
    score: 0,
    hasBudget: false,
    urgency: 'unknown',
    objections: []
  };
}