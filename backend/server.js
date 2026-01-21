import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateAgentResponse } from './agents/demo-agent.js';
import { calculateTypingDelay, simulateTyping } from './services/humanizer.js';
import { generateFakeStats, generateFakeConversations, generateFakeLeads, generateFakeChannelConversations } from './services/fake-data.js';
import configRoutes from './routes/config.js';
import productsRoutes from './routes/products.js';
import supabase from './config/supabase.js';
import contactsRoutes from './routes/contacts.js';

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

// Almacenar conversaciones en memoria (para demo)
const conversations = new Map();

// Endpoint: Recibir mensaje
app.post('/webhook/demo-message', async (req, res) => {
  const { userId, message, platform } = req.body;
  
  console.log(`📩 Mensaje recibido de ${userId}: ${message}`);
  
  // Obtener historial
  let history = conversations.get(userId) || [];
  
  // Socket.IO deshabilitado
  // io.emit('userMessage', {
  //   userId,
  //   platform: platform || 'instagram',
  //   message,
  //   timestamp: new Date().toISOString()
  // });

  // io.emit('setterTyping', { userId, isTyping: true });
  
  try {
    // Obtener el clientId del primer cliente (Demo Business)
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('business_name', 'Demo Business')
      .single();

    const clientId = client?.id;

    // Generar respuesta del agente
    const aiResponse = await generateAgentResponse(history, message, clientId);

    console.log('🔍 Respuesta del agente:', {
      text: aiResponse.text,
      productsFound: aiResponse.products?.length || 0
    });

    // Log detallado de productos con imágenes
    if (aiResponse.products && aiResponse.products.length > 0) {
      console.log('📦 Productos encontrados:');
      aiResponse.products.forEach(p => {
        console.log(`  - ${p.name}`);
        console.log(`    image_urls:`, p.image_urls || 'NO DEFINIDO');
        console.log(`    Tiene imágenes:`, !!p.image_urls && p.image_urls.length > 0);
      });
    }

    // Calcular delay natural
    const typingDelay = calculateTypingDelay(aiResponse.text);

    console.log(`⏱️ Simulando escritura: ${typingDelay}ms`);

    // Simular que el setter está escribiendo
    await simulateTyping(typingDelay);

    // Actualizar historial
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: aiResponse.text });
    conversations.set(userId, history);

    // Socket.IO deshabilitado
    // io.emit('setterMessage', {
    //   userId,
    //   message: aiResponse.text,
    //   timestamp: Date.now()
    // });

    // if (aiResponse.products && aiResponse.products.length > 0) {
    //   console.log('📦 Enviando productos:', aiResponse.products.length);
    //   io.emit('setterProducts', {
    //     userId,
    //     products: aiResponse.products,
    //     timestamp: Date.now()
    //   });
    // }

    // io.emit('setterTyping', { userId, isTyping: false });

    console.log(`✅ Agente respondió: ${aiResponse.text}`);

    res.json({ success: true, response: aiResponse.text, products: aiResponse.products });
    
  } catch (error) {
    console.error('❌ Error:', error);
    // io.emit('setterTyping', { userId, isTyping: false });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint: Stats fake
app.get('/api/demo/stats', (req, res) => {
  res.json(generateFakeStats());
});

// Endpoint: Conversaciones fake
app.get('/api/demo/conversations', (req, res) => {
  res.json(generateFakeConversations());
});

// Endpoint: Obtener historial de conversación específica
app.get('/api/demo/conversation/:convId', (req, res) => {
  const { convId } = req.params;
  const history = conversations.get(convId) || [];

  // Convertir historial a formato de mensajes para el frontend
  const messages = history.map((msg) => ({
    type: msg.role === 'user' ? 'user' : 'agent',
    text: msg.content,
    timestamp: new Date().toISOString()
  }));

  res.json({
    success: true,
    messages,
    isTyping: false
  });
});

// Endpoint: Leads fake
app.get('/api/demo/leads', (req, res) => {
  res.json(generateFakeLeads());
});

// Endpoint: Conversaciones por canal
app.get('/api/conversations/:channel', (req, res) => {
  const { channel } = req.params;
  const validChannels = ['instagram', 'whatsapp', 'facebook'];

  if (!validChannels.includes(channel)) {
    return res.status(400).json({ success: false, error: 'Canal inválido' });
  }

  const conversations = generateFakeChannelConversations(channel, 15);
  res.json({ success: true, data: conversations });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on ${PORT}`);
});