import supabase from '../config/supabase.js';

// Función para generar color único por contacto
function getContactColor(firstName, lastName) {
  const name = `${firstName}${lastName}`;
  const colors = [
    { bg: '#FF6B6B', text: '#FFFFFF' }, // Rojo coral
    { bg: '#4ECDC4', text: '#FFFFFF' }, // Turquesa
    { bg: '#45B7D1', text: '#FFFFFF' }, // Azul cielo
    { bg: '#96CEB4', text: '#2D3436' }, // Verde menta
    { bg: '#6C5CE7', text: '#FFFFFF' }, // Púrpura
    { bg: '#00B894', text: '#FFFFFF' }, // Esmeralda
    { bg: '#FD79A8', text: '#FFFFFF' }, // Rosa
    { bg: '#FDCB6E', text: '#2D3436' }, // Naranja dorado
    { bg: '#A29BFE', text: '#FFFFFF' }, // Lavanda
    { bg: '#74B9FF', text: '#FFFFFF' }, // Azul claro
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

// ─── Cached dashboard stats (TTL 5 min, invalidated on setup) ───

let statsCache = null;
let statsCacheAt = 0;
const STATS_TTL = 5 * 60 * 1000; // 5 minutes

/** Call after POST /api/demo/setup to force regeneration */
export function invalidateStatsCache() {
  statsCache = null;
  statsCacheAt = 0;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build ascending 7-day trend from a base value */
function buildDailyTrend(basePerDay) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Ascending trend: older days get lower multiplier
    const multiplier = 0.6 + (6 - i) * 0.065 + (Math.random() * 0.1);
    days.push({ date: dateStr, count: Math.round(basePerDay * multiplier) });
  }
  return days;
}

function formatRelativeTime(minutesAgo) {
  if (minutesAgo < 1) return 'hace un momento';
  if (minutesAgo < 60) return `hace ${Math.round(minutesAgo)} min`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export async function generateDashboardStats() {
  if (statsCache && Date.now() - statsCacheAt < STATS_TTL) return statsCache;

  // ── Fetch real counts from Supabase ──
  const [productsRes, contactsRes, contactDetailsRes] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('name, lead_quality, platform, lifetime_value, last_interaction_at')
  ]);

  const totalProducts = productsRes.count || 0;
  const totalContacts = contactsRes.count || 0;
  const contacts = contactDetailsRes.data || [];

  // ── Derived metrics (stable per cache window) ──
  const conversationMultiplier = randomInt(8, 15);
  const totalConversations = totalContacts * conversationMultiplier;
  const totalLeads = contacts.filter(c => c.lead_quality === 'warm' || c.lead_quality === 'hot').length;
  const urgentLeads = contacts.filter(c => c.lead_quality === 'hot').length;
  const conversionRate = randomInt(22, 32);

  // ── Channel distribution from actual contact platforms ──
  const channelCounts = { instagram: 0, whatsapp: 0, facebook: 0 };
  contacts.forEach(c => {
    if (channelCounts[c.platform] !== undefined) channelCounts[c.platform]++;
  });
  const totalPlatform = contacts.length || 1;
  const channelDistribution = {
    instagram: Math.round((channelCounts.instagram / totalPlatform) * 100),
    whatsapp: Math.round((channelCounts.whatsapp / totalPlatform) * 100),
    facebook: Math.round((channelCounts.facebook / totalPlatform) * 100)
  };
  // Ensure they sum to 100
  const diff = 100 - channelDistribution.instagram - channelDistribution.whatsapp - channelDistribution.facebook;
  channelDistribution.instagram += diff;

  // ── Daily conversations trend (ascending for good demo) ──
  const avgPerDay = Math.max(Math.round(totalConversations / 30), 5);
  const dailyConversations = buildDailyTrend(avgPerDay);

  // ── Badges (generate small counts for sidebar) ──
  const badges = {
    appointments: randomInt(2, 5),
    orders: randomInt(3, 6),
    alerts: randomInt(1, 4)
  };

  // ── Recent activity from real contacts ──
  const activityTypes = [
    { type: 'new_lead', template: (c) => ({ type: 'new_lead', name: c.name, platform: c.platform }) },
    { type: 'sale', template: (c) => ({ type: 'sale', name: c.name, amount: `${(c.lifetime_value || randomInt(80, 500) * 1000).toLocaleString('es-PY')} Gs` }) },
    { type: 'message', template: (c) => ({ type: 'message', name: c.name, platform: c.platform }) },
    { type: 'qualified', template: (c) => ({ type: 'qualified', name: c.name, platform: c.platform }) },
    { type: 'appointment', template: (c) => ({ type: 'appointment', name: c.name, platform: c.platform }) },
  ];

  const recentActivity = [];
  // Sort contacts by last_interaction to get the most recent ones
  const sortedContacts = [...contacts]
    .sort((a, b) => new Date(b.last_interaction_at) - new Date(a.last_interaction_at))
    .slice(0, 5);

  const timeOffsets = [2, 15, 38, 95, 180]; // minutes ago — spread nicely
  sortedContacts.forEach((contact, i) => {
    const at = pick(activityTypes);
    recentActivity.push({
      ...at.template(contact),
      time: formatRelativeTime(timeOffsets[i] || randomInt(5, 300))
    });
  });

  statsCache = {
    // From Supabase
    totalProducts,
    totalContacts,

    // Derived
    totalConversations,
    totalLeads,
    urgentLeads,
    conversionRate,

    // Change indicators (always positive for demo)
    conversationsChange: '+12%',
    leadsChange: '+8%',
    conversionChange: '+3.2%',

    // Charts
    dailyConversations,
    channelDistribution,

    // Sidebar badges
    badges,

    // Activity feed
    recentActivity
  };

  statsCacheAt = Date.now();
  return statsCache;
}

// Legacy export kept for backward compat — now wraps the async version with fallback
export function generateFakeStats() {
  if (statsCache) return statsCache;
  // Fallback if async hasn't been called yet
  return {
    totalProducts: 0,
    totalContacts: 0,
    totalConversations: 0,
    totalLeads: 0,
    urgentLeads: 0,
    conversionRate: 25,
    conversationsChange: '+12%',
    leadsChange: '+8%',
    conversionChange: '+3.2%',
    dailyConversations: [],
    channelDistribution: { instagram: 45, whatsapp: 35, facebook: 20 },
    badges: { appointments: 3, orders: 4, alerts: 2 },
    recentActivity: []
  };
}

export function generateFakeConversations() {
  const names = ['María González', 'Carlos Mendoza', 'Ana Silva', 'Luis Ramírez', 'Sofía Torres'];
  const platforms = ['instagram', 'facebook', 'whatsapp'];
  const messages = [
    'Hola, vi el video de Sebas...',
    'Me interesa el curso de trading',
    'Cuánto cuesta el curso?',
    'Ya estoy listo para empezar',
    'Tengo experiencia en forex'
  ];
  
  return names.map((name, i) => ({
    id: i + 1,
    name,
    platform: platforms[i % 3],
    lastMessage: messages[i],
    status: Math.random() > 0.5 ? 'active' : 'qualified',
    timestamp: `${Math.floor(Math.random() * 30) + 1} min ago`,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
  }));
}

export function generateFakeLeads() {
  return [
    { name: 'Pedro Martínez', score: 85, capital: '$500', experience: 'Principiante', status: 'qualified' },
    { name: 'Laura Benítez', score: 92, capital: '$1000', experience: 'Intermedio', status: 'qualified' },
    { name: 'Jorge Villalba', score: 78, capital: '$300', experience: 'Principiante', status: 'qualified' },
  ];
}

// Generador de conversaciones por canal
export function generateFakeChannelConversations(channel, count = 15) {
  const firstNames = ['María', 'Carlos', 'Ana', 'Luis', 'Rosa', 'Pedro', 'Carmen', 'José', 'Laura', 'Miguel', 'Sofía', 'Diego', 'Patricia', 'Fernando', 'Verónica', 'Héctor', 'Lorena'];
  const lastNames = ['González', 'Rodríguez', 'Martínez', 'López', 'Fernández', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Benítez', 'Cardozo', 'Cabrera', 'Franco', 'Mendoza', 'Silva'];

  const messageExamples = {
    instagram: [
      'Hola! Me interesa el anillo de compromiso',
      'Vi tu publicación y quiero saber más',
      'Tienen aretes de plata?',
      'Cuál es el precio del collar?',
      'Hacen delivery a Asunción?',
      'Me encantó el diseño que subieron',
      'Quisiera ver más modelos',
      'Tienen disponibilidad para esta semana?'
    ],
    whatsapp: [
      'Buenos días, consulta por precios',
      'Hola, quiero hacer un pedido',
      'Me pasas el catálogo completo?',
      'Cuánto cuesta el envío?',
      'Tienen stock del anillo de oro?',
      'Quisiera agendar una cita',
      'Me interesa la pulsera',
      'Aceptan tarjetas de crédito?'
    ],
    facebook: [
      'Hola! Cómo están?',
      'Me interesa un regalo para mi novia',
      'Tienen tienda física?',
      'Cuáles son los métodos de pago?',
      'Me gustaría ver las alianzas',
      'Hacen diseños personalizados?',
      'Cuánto demora el delivery?',
      'Tienen garantía los productos?'
    ]
  };

  const conversations = [];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const color = getContactColor(firstName, lastName);

    // Determinar estado y temperatura
    const statusOptions = ['nuevo', 'en_progreso', 'calificado', 'cerrado'];
    const statusWeights = [0.4, 0.3, 0.2, 0.1]; // 40%, 30%, 20%, 10%
    const rand = Math.random();
    let status = statusOptions[0];
    let cumulative = 0;
    for (let j = 0; j < statusOptions.length; j++) {
      cumulative += statusWeights[j];
      if (rand <= cumulative) {
        status = statusOptions[j];
        break;
      }
    }

    const leadScore = Math.floor(Math.random() * 100);
    const temperature = leadScore >= 70 ? 'hot' : leadScore >= 40 ? 'warm' : 'cold';

    // Generar mensajes
    const numMessages = 5 + Math.floor(Math.random() * 5);
    const messages = [];
    const now = Date.now();

    for (let j = 0; j < numMessages; j++) {
      const isUser = j % 2 === 0;
      messages.push({
        id: `msg_${i}_${j}`,
        text: isUser
          ? messageExamples[channel][Math.floor(Math.random() * messageExamples[channel].length)]
          : j === 1
            ? `¡Hola ${firstName}! ¿Cómo estás? Soy Jessica de Silver Line. ¿En qué puedo ayudarte hoy?`
            : ['Perfecto! Te cuento que...', 'Claro, con gusto te ayudo', 'Genial, mira...', 'Por supuesto!'][Math.floor(Math.random() * 4)],
        sender: isUser ? 'user' : Math.random() > 0.5 ? 'ai' : 'agent',
        timestamp: new Date(now - (numMessages - j) * 5 * 60 * 1000).toISOString(),
        seen: true
      });
    }

    const conversation = {
      id: `conv_${channel}_${i + 1}`,
      platform: channel,
      status: status,
      unreadCount: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
      aiEnabled: Math.random() > 0.4,
      assignedTo: Math.random() > 0.7 ? 'agent_1' : null,

      contact: {
        // DATOS QUE MANYCHAT ENVÍA:
        subscriber_id: `${7000000000 + i}`,
        first_name: firstName,
        last_name: lastName,

        // Color único generado
        color: color,

        // PHONE: Solo si es WhatsApp o si lo recolectaste
        phone: channel === 'whatsapp' ? `+595${9 + Math.floor(Math.random() * 2)}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}` : null,

        // INSTAGRAM_ID: Solo número, NO username visible
        instagram_id: channel === 'instagram' ? `${17841400000000000 + i}` : null,

        // WHATSAPP_PHONE: Solo si es WhatsApp
        whatsapp_phone: channel === 'whatsapp' ? `+595${9 + Math.floor(Math.random() * 2)}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}` : null,

        // EMAIL: Opcional (30% de probabilidad)
        email: Math.random() > 0.7 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com` : null,

        // LAST INTERACTION
        last_interaction_at: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString(),

        // STATUS
        status: 'active',

        // CUSTOM FIELDS (configurados en ManyChat)
        custom_fields: {
          presupuesto: ['bajo', 'medio', 'alto'][Math.floor(Math.random() * 3)],
          producto_interes: ['anillo', 'collar', 'pulsera', 'aretes', 'alianzas'][Math.floor(Math.random() * 5)],
          urgencia: ['baja', 'media', 'alta'][Math.floor(Math.random() * 3)],
          ciudad: ['Asunción', 'Ciudad del Este', 'Encarnación'][Math.floor(Math.random() * 3)]
        },

        // TAGS (asignados manualmente o por automation)
        tags: (() => {
          const allTags = ['lead_caliente', 'compromiso', 'consulta', 'urgente', 'vip', 'delivery'];
          const numTags = Math.floor(Math.random() * 3) + 1;
          return allTags.sort(() => 0.5 - Math.random()).slice(0, numTags);
        })(),

        // LEAD SCORE (calculado por TU sistema, no viene de ManyChat)
        leadScore: leadScore,
        temperature: temperature,
      },

      lastMessage: {
        text: messageExamples[channel][Math.floor(Math.random() * messageExamples[channel].length)],
        timestamp: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000).toISOString(),
        sender: 'user'
      },

      messages: messages
    };

    conversations.push(conversation);
  }

  // Ordenar por última interacción (más reciente primero)
  conversations.sort((a, b) =>
    new Date(b.contact.last_interaction_at) - new Date(a.contact.last_interaction_at)
  );

  return conversations;
}