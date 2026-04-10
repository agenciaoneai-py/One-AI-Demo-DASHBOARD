import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleDemoChat, clearConversationCache } from './agents/demo-agent.js';
import { generateFakeStats, generateDashboardStats, generateFakeConversations, generateFakeLeads, generateFakeChannelConversations } from './services/fake-data.js';
import configRoutes from './routes/config.js';
import productsRoutes from './routes/products.js';
import supabase from './config/supabase.js';
import contactsRoutes from './routes/contacts.js';
import demoSetupRoutes from './routes/demo-setup.js';
import demoPageRoutes from './routes/demo-pages.js';

dotenv.config();

console.log('🔍 Environment loaded:');
console.log('  - FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - PORT:', process.env.PORT);

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health checks - DEBEN estar primero
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(express.json());
app.use('/api/products', productsRoutes);
app.use('/api/contacts', contactsRoutes);

// Endpoint: Chat con el agente IA (function calling + vision)
app.post('/webhook/demo-message', async (req, res) => {
  try {
    const { userId, message, platform, imageUrl } = req.body;

    if (!userId || (!message && !imageUrl)) {
      return res.status(400).json({ error: 'userId y message (o imageUrl) son requeridos' });
    }

    console.log(`📩 [${userId}] ${message || '(imagen)'}`);

    const result = await handleDemoChat(
      userId,
      message || '',
      platform || 'demo',
      imageUrl || null,
    );

    // Humanización: typing delay basado en longitud (1.5–3s)
    const delay = Math.min(Math.max((result.response?.length || 0) * 15, 1500), 3000);
    await new Promise(resolve => setTimeout(resolve, delay));

    console.log(`✅ Respuesta enviada (${result.products.length} productos${result.appointment ? ', cita creada' : ''}${result.order ? ', pedido creado' : ''})`);

    res.json({
      response: result.response,
      products: result.products || [],
      appointment: result.appointment || null,
      order: result.order || null,
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Error procesando mensaje' });
  }
});

// Endpoint: Obtener prompt del agente
app.get('/api/demo/prompt', async (req, res) => {
  try {
    const { data: client } = await supabase.from('clients').select('id').limit(1).single();
    const clientId = client?.id;
    const { data } = await supabase
      .from('agent_prompts')
      .select('prompt_text')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();
    res.json({ success: true, prompt: data?.prompt_text || '' });
  } catch (error) {
    res.json({ success: true, prompt: '' });
  }
});

// Endpoint: Actualizar prompt del agente
app.put('/api/demo/prompt', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ success: false, error: 'Prompt requerido' });
  try {
    const { data: client } = await supabase.from('clients').select('id').limit(1).single();
    const clientId = client?.id;
    await supabase
      .from('agent_prompts')
      .update({ prompt_text: prompt.trim() })
      .eq('client_id', clientId)
      .eq('is_active', true);
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint: Limpiar historial de conversación del simulador
app.delete('/api/demo/conversation/:userId', (req, res) => {
  clearConversationCache(req.params.userId);
  res.json({ success: true });
});

// Endpoint: Dashboard stats (datos reales de Supabase + generados)
app.get('/api/demo/stats', async (req, res) => {
  try {
    const stats = await generateDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error generando stats:', error);
    res.json(generateFakeStats());
  }
});

// Endpoint: Conversaciones fake
app.get('/api/demo/conversations', (req, res) => {
  res.json(generateFakeConversations());
});

// Endpoint: Leads fake
app.get('/api/demo/leads', (req, res) => {
  res.json(generateFakeLeads());
});

// Endpoint: Conversaciones por canal (normalizado para frontend)
app.get('/api/conversations/:channel', (req, res) => {
  const { channel } = req.params;
  const validChannels = ['instagram', 'whatsapp', 'facebook'];

  if (!validChannels.includes(channel)) {
    return res.status(400).json({ success: false, error: 'Canal inválido' });
  }

  const raw = generateFakeChannelConversations(channel, 15);

  // Normalize to shape expected by new frontend
  const conversations = raw.map(c => ({
    id: c.id,
    user_id: c.contact.subscriber_id,
    platform: c.platform,
    ai_mode: c.aiEnabled ? 'automatic' : 'manual',
    unread_count: c.unreadCount || 0,
    status: c.status,
    assigned_to: c.assignedTo,
    last_message: c.lastMessage?.text || '',
    last_message_at: c.lastMessage?.timestamp || c.contact.last_interaction_at,
    contact: {
      name: `${c.contact.first_name} ${c.contact.last_name}`,
      first_name: c.contact.first_name,
      last_name: c.contact.last_name,
      username: c.contact.email?.split('@')[0] || null,
      phone: c.contact.phone || c.contact.whatsapp_phone,
      email: c.contact.email,
      lead_temperature: c.contact.temperature,
      lead_score: c.contact.leadScore,
      avatar_url: null,
      subscriber_id: c.contact.subscriber_id,
      instagram_id: c.contact.instagram_id,
      whatsapp_phone: c.contact.whatsapp_phone,
      last_interaction_at: c.contact.last_interaction_at,
      custom_fields: c.contact.custom_fields,
      tags: c.contact.tags,
      color: c.contact.color,
    },
    messages: c.messages,
  }));

  res.json({ success: true, data: conversations, conversations });
});

// Endpoint: Enviar mensaje (fake)
app.post('/api/conversations/:convId/messages', (req, res) => {
  const { convId } = req.params;
  const { message } = req.body;

  // Simulación: solo responde success
  res.json({
    success: true,
    message: 'Mensaje enviado',
    data: {
      id: `msg_${Date.now()}`,
      text: message,
      sender: 'agent',
      timestamp: new Date().toISOString(),
      seen: false
    }
  });
});

// Endpoint: Toggle AI (Hand-off)
app.post('/api/conversations/:convId/toggle-ai', (req, res) => {
  const { convId } = req.params;
  const { aiEnabled } = req.body;

  console.log(`🔄 Hand-off: Conversación ${convId} → ${aiEnabled ? 'IA Activada' : 'Modo Manual'}`);

  res.json({
    success: true,
    convId,
    aiEnabled,
    message: aiEnabled ? 'IA activada exitosamente' : 'Modo manual activado'
  });
});

// Socket.IO deshabilitado
// io.on('connection', (socket) => {
//   console.log('🔌 Cliente conectado:', socket.id);

//   socket.on('disconnect', () => {
//     console.log('🔌 Cliente desconectado:', socket.id);
//   });
// });

// Emitir eventos fake cada 30 segundos (simular actividad)
// setInterval(() => {
//   io.emit('statsUpdate', generateFakeStats());
// }, 30000);

// Rutas de configuracion
app.use('/api/config', configRoutes);
app.use('/api/demo', demoSetupRoutes);
app.use('/api', demoPageRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on ${PORT}`);
});