import supabase from '../config/supabase.js';
import { CLIENT_CONFIG } from '../config/client-config.js';

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
  const isZamph = CLIENT_CONFIG.businessName && CLIENT_CONFIG.businessName.includes('Zamphiropolos');
  const conversationMultiplier = isZamph ? randomInt(15, 20) : randomInt(8, 15);
  const totalConversations = isZamph ? randomInt(180, 250) : totalContacts * conversationMultiplier;
  const totalLeads = contacts.filter(c => c.lead_quality === 'warm' || c.lead_quality === 'hot').length;
  const urgentLeads = isZamph ? randomInt(35, 50) : contacts.filter(c => c.lead_quality === 'hot').length;
  const conversionRate = isZamph ? randomInt(28, 35) : randomInt(22, 32);

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

  // ── Revenue data ──
  const totalRevenue = isZamph ? randomInt(150, 250) * 1000000 : contacts.reduce((sum, c) => sum + (parseFloat(c.lifetime_value) || 0), 0);
  const ordersCount = isZamph ? randomInt(40, 60) : randomInt(28, 45);
  const avgOrderValue = isZamph ? randomInt(3000, 5000) * 1000 : (ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0);
  const igRevPct = channelDistribution.instagram / 100;
  const waRevPct = channelDistribution.whatsapp / 100;
  const fbRevPct = channelDistribution.facebook / 100;

  const revenue = {
    total_revenue: totalRevenue || randomInt(8, 18) * 1000000,
    orders_count: ordersCount,
    avg_order_value: avgOrderValue || randomInt(250, 500) * 1000,
    revenue_by_platform: {
      instagram: Math.round((totalRevenue || 12000000) * igRevPct),
      whatsapp: Math.round((totalRevenue || 12000000) * waRevPct),
      facebook: Math.round((totalRevenue || 12000000) * fbRevPct),
    }
  };

  // ── Budget IA ──
  const budget = { percent_used: randomInt(18, 35) };

  // ── Platform totals (absolute counts for donut center) ──
  const platformTotals = { ...channelCounts };

  // ── Lead temperature counts ──
  const hotLeads = contacts.filter(c => c.lead_quality === 'hot').length;
  const warmLeads = contacts.filter(c => c.lead_quality === 'warm').length;
  const coldLeads = contacts.filter(c => c.lead_quality === 'cold').length;
  const leadTemperature = { hot: hotLeads, warm: warmLeads, cold: coldLeads };

  // ── Messaging totals ──
  const totalMessages = totalConversations * randomInt(5, 9);
  const totalUniqueUsers = Math.round(totalContacts * 0.85);
  const avgDaily = Math.round(totalMessages / 30);
  const last24h = randomInt(Math.round(avgDaily * 0.5), Math.round(avgDaily * 1.3));
  const avgScore = randomInt(55, 78);

  // ── Contacts by platform (absolute) ──
  const contactsByPlatform = { ...channelCounts };

  // ── Enhanced daily conversations with labels ──
  const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const todayStr = new Date().toISOString().slice(0, 10);
  const enrichedDaily = dailyConversations.map((d, i) => {
    const dt = new Date(d.date);
    return {
      date: dayNames[dt.getDay()],
      fullDate: dt.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' }),
      conversations: d.count,
      isToday: d.date === todayStr,
      showLabel: true,
    };
  });

  // ── Enhanced recent activity with richer fields ──
  const statusLabels = ['Calificado', 'Nuevo', 'En seguimiento', 'Convertido', 'Interesado'];
  const noteTemplates = isZamph ? [
    'Cotización etiquetas adhesivas',
    'Consulta hologramas de seguridad',
    'Pedido de packaging personalizado',
    'Renovación de cheques de seguridad',
    'Etiquetas termocontraíbles para bebidas',
    'Book labels para farmacéutica',
    'Hang tags para línea textil',
    'Precintos de seguridad para botellas',
  ] : [
    'Interesada en pulsera de perlas',
    'Consultó precios de anillos',
    'Pidió catálogo completo',
    'Quiere agendar visita',
    'Solicitó info de delivery',
    'Preguntó por alianzas',
    'Interesado en collar oro rosa',
    'Volvió a preguntar por stock',
  ];

  const enrichedActivity = sortedContacts.map((contact, i) => {
    const names = contact.name.split(' ');
    const initials = names.map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return {
      id: i + 1,
      name: contact.name,
      initials,
      platform: contact.platform,
      status: pick(statusLabels),
      timeAgo: formatRelativeTime(timeOffsets[i] || randomInt(5, 300)),
      note: pick(noteTemplates),
      temperature: contact.lead_quality || 'warm',
    };
  });

  // ── Sparkline data (7 points per stat card) ──
  const makeSparkline = (base, trend = 'up') => {
    const pts = [];
    for (let i = 0; i < 7; i++) {
      const factor = trend === 'up' ? 0.7 + (i * 0.05) : 1.0 - (i * 0.03);
      pts.push({ value: Math.round(base * factor * (0.85 + Math.random() * 0.3)) });
    }
    return pts;
  };

  statsCache = {
    // From Supabase
    totalProducts,
    totalContacts,

    // KPIs
    totalConversations,
    totalLeads,
    urgentLeads,
    conversionRate,
    activeUsers24h: last24h,

    // Change indicators
    conversationsChange: '+12%',
    leadsChange: '+8%',
    activeChange: '+15%',
    conversionChange: '+3.2%',

    // Sparklines
    sparklines: {
      conversations: makeSparkline(Math.round(totalConversations / 7)),
      leads: makeSparkline(Math.round(totalLeads / 7)),
      active: makeSparkline(Math.round(last24h / 7)),
      conversion: makeSparkline(conversionRate, 'up'),
    },

    // Revenue
    revenue,

    // Budget IA
    budget,

    // Charts
    dailyConversations: enrichedDaily,
    channelDistribution,
    platformTotals,

    // Messages
    totalMessages,
    totalUniqueUsers,
    avgDaily,
    last24h,
    avgScore,

    // Contacts by platform
    contactsByPlatform,

    // Lead temperature
    leadTemperature,

    // Sidebar badges
    badges,

    // Activity feed (enriched)
    recentActivity: enrichedActivity
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

// ─── Zamphiropolos-specific conversations ────────────────────────────────────

const ZAMPH_IMG = {
  adhesivas: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/626954867d9517edd360ca27_Portada%20de%20ETIQUETAS.jpg',
  termo: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/67efbc0aebf60a9106971c19_AGRO%201jpg%20(1).jpg',
  book: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/67ef0fa7b92715ab841fc7be_Etiqueta%20libro%20WEB%20(1).jpg',
  refri: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/68e92f2344e439f13a48edb1_NEULAND.jpeg',
  packaging: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/6262d225f8d2be60dd63f0ba_Packaging.jpg',
  hologramas: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/62601424126332cae3900bde_Hologramas.jpg',
  hangtag: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/63ed4b0c21f3950caa15c2e2_hantag1.jpg',
  wrap: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/628ac9b59e24d05cc8f99b3d_Wrap-around.jpg',
  void: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/628aca9556b75ccaa37bde1c_Cintas-Void.jpg',
};

const ZAMPH_CONVERSATIONS = [
  { contact: { first_name: 'María', last_name: 'Fernández', company: 'Lácteos del Sur' }, platform: 'whatsapp', temp: 'hot', score: 85,
    msgs: [
      { text: 'Hola, necesito cotización de etiquetas adhesivas para yogurt' },
      { text: 'Hola María! Dale, mirá estas son las que usamos para lácteos:', image: ZAMPH_IMG.refri },
      { text: 'Genial! Cuántas unidades necesito como mínimo?' },
      { text: 'Generalmente arrancamos desde 1.000. ¿Cuántas necesitás por mes?' },
      { text: 'Unas 10.000 mensuales, son potes de 200ml' },
      { text: 'Perfecto, te paso con Victor Barreto nuestro asesor de etiquetas para armarte la cotización' },
    ] },
  { contact: { first_name: 'Roberto', last_name: 'Giménez', company: 'Frigorífico Nacional' }, platform: 'whatsapp', temp: 'hot', score: 90,
    msgs: [
      { text: 'Buenas tardes, estamos buscando etiquetas termocontraíbles para embutidos' },
      { text: 'Hola Roberto! Mirá, estas son las termocontraíbles que manejamos:', image: ZAMPH_IMG.termo },
      { text: 'Se ven bien. Necesitamos full sleeve para bandejas termoformadas' },
      { text: 'Perfecto, para bandejas son ideales. ¿Qué volumen mensual manejan?' },
      { text: 'Unas 20.000 unidades por mes' },
      { text: 'Dale Roberto, ya te paso con Victor Barreto del área de etiquetas. Él te arma la cotización' },
    ], aiPaused: true, pauseReason: 'Derivado a Victor Barreto — Área de Etiquetas' },
  { contact: { first_name: 'Carolina', last_name: 'Benítez', company: 'Farmacia Central' }, platform: 'whatsapp', temp: 'warm', score: 72,
    msgs: [
      { text: 'Hola, necesitamos hologramas de seguridad para medicamentos' },
      { text: 'Hola Carolina! Mirá, estos son nuestros hologramas:', image: ZAMPH_IMG.hologramas },
      { text: 'Exacto eso necesitamos, tenemos problemas de falsificación' },
      { text: 'Te entiendo, es un tema serio. ¿Para cuántos productos necesitás?' },
    ] },
  { contact: { first_name: 'Luis', last_name: 'Aquino', company: 'Cervecería Asunción' }, platform: 'whatsapp', temp: 'hot', score: 88,
    msgs: [
      { text: 'Buen día, consulta por etiquetas para botellas de cerveza artesanal' },
      { text: 'Hola Luis! Para cerveza las wrap around quedan geniales. Mirá:', image: ZAMPH_IMG.wrap },
      { text: '4 variedades, unas 2000 botellas por mes de cada una' },
      { text: 'Dale, 8000 mensuales. ¿Ya tenés los diseños o necesitás que los hagamos?' },
    ] },
  { contact: { first_name: 'Ana', last_name: 'Rojas', company: 'Cosmética Natural PY' }, platform: 'instagram', temp: 'warm', score: 65,
    msgs: [
      { text: 'Hola! Vi que hacen etiquetas personalizadas. Tengo una marca de cosméticos' },
      { text: 'Hola Ana! Sí, para frascos de vidrio las adhesivas quedan perfectas:', image: ZAMPH_IMG.adhesivas },
      { text: 'Hermosas! Son para cremas y aceites esenciales' },
      { text: 'Genial, ¿cuántas unidades necesitás aproximadamente?' },
    ] },
  { contact: { first_name: 'Jorge', last_name: 'Mendoza', company: 'Banco Regional' }, platform: 'whatsapp', temp: 'hot', score: 92,
    msgs: [
      { text: 'Necesitamos renovar nuestro stock de cheques de seguridad' },
      { text: 'Hola Jorge! Dale, ¿cuántos talonarios necesitan y para qué sucursales?' },
      { text: '500 talonarios, para las 12 sucursales' },
      { text: 'Listo Jorge, te paso con Fabricio Talavera del área de seguridad. Él te arma todo' },
    ], aiPaused: true, pauseReason: 'Derivado a Fabricio Talavera — Área de Seguridad' },
  { contact: { first_name: 'Patricia', last_name: 'López', company: 'Yerbatera Campesina' }, platform: 'facebook', temp: 'warm', score: 70,
    msgs: [
      { text: 'Buenas, estamos rediseñando el packaging de nuestra yerba mate' },
      { text: 'Hola Patricia! Mirá lo que hacemos en packaging:', image: ZAMPH_IMG.packaging },
      { text: 'Packaging flexible, bolsas de 500g y 1kg' },
      { text: 'Dale, te conecto con Alma Aveiro de packaging para que vean materiales' },
    ] },
  { contact: { first_name: 'Diego', last_name: 'Villalba', company: 'Laboratorio Catedral' }, platform: 'whatsapp', temp: 'hot', score: 95,
    msgs: [
      { text: 'Hola, necesitamos etiquetas libro para productos farmacéuticos' },
      { text: 'Hola Diego! Las book label son perfectas para farma. Mirá:', image: ZAMPH_IMG.book },
      { text: '15 presentaciones, tiraje de 50.000 unidades por producto' },
      { text: 'Perfecto, es un volumen importante. ¿Ya tenés los artes finales?' },
      { text: 'Sí, los tenemos en AI y PDF' },
      { text: 'Genial, te agendo con Victor Barreto para que revisen las especificaciones técnicas' },
    ] },
  { contact: { first_name: 'Marcela', last_name: 'Acosta', company: 'Textil Guaraní' }, platform: 'instagram', temp: 'warm', score: 68,
    msgs: [
      { text: 'Hola! Necesitamos hang tags para nuestra nueva línea de ropa' },
      { text: 'Hola Marcela! Mirá estos hang tags que hicimos:', image: ZAMPH_IMG.hangtag },
      { text: 'Algo así pero con stamping dorado, unas 5000 unidades' },
      { text: 'Podemos hacer stamping dorado sobre cartulina negra o kraft. ¿Cuál te gusta más?' },
    ] },
  { contact: { first_name: 'Fernando', last_name: 'Martínez', company: 'Agrosol Paraguay' }, platform: 'whatsapp', temp: 'hot', score: 93,
    msgs: [
      { text: 'Buen día, somos Agrosol. Necesitamos renovar etiquetas de agroquímicos' },
      { text: 'Hola Fernando! Ya trabajamos con ustedes. Para agroquímicos las book label van perfecto:', image: ZAMPH_IMG.book },
      { text: 'Sí, 3 herbicidas y 2 insecticidas nuevos' },
      { text: 'Dale, las book label con resistencia UV son ideales. Te conecto con Victor para el detalle' },
    ], aiPaused: true, pauseReason: 'Derivado a Victor Barreto — Área de Etiquetas' },
  { contact: { first_name: 'Gabriela', last_name: 'Insfrán', company: 'Embotelladora del Este' }, platform: 'whatsapp', temp: 'warm', score: 74,
    msgs: [
      { text: 'Hola, necesitamos precintos termocontraíbles para botellas de agua' },
      { text: 'Hola Gabriela! Los precintos garantizan la integridad del sellado. ¿Qué volumen manejan?' },
      { text: 'Unas 100.000 unidades mensuales' },
      { text: 'Perfecto, te paso con Victor para la cotización del volumen' },
    ] },
  { contact: { first_name: 'Ricardo', last_name: 'Bogado', company: 'Coop. Chortitzer' }, platform: 'facebook', temp: 'hot', score: 87,
    msgs: [
      { text: 'Buenas, necesitamos etiquetas para nuestra línea de lácteos' },
      { text: 'Hola Ricardo! Para refrigerados tenemos estas:', image: ZAMPH_IMG.refri },
      { text: 'Sí, para leche y quesos' },
      { text: 'Perfectas para frío. ¿Cuántas unidades mensuales necesitan?' },
    ] },
];

function buildZamphConversations(channel) {
  const now = Date.now();
  return ZAMPH_CONVERSATIONS
    .filter(c => c.platform === channel)
    .map((conv, i) => {
      const { first_name, last_name, company } = conv.contact;
      const color = getContactColor(first_name, last_name);
      const messages = conv.msgs.map((m, j) => ({
        id: `msg_${i}_${j}`,
        text: m.text,
        image: m.image || null,
        sender: j % 2 === 0 ? 'user' : 'ai',
        timestamp: new Date(now - (conv.msgs.length - j) * 8 * 60 * 1000).toISOString(),
        seen: true,
      }));
      const lastMsg = conv.msgs[conv.msgs.length - 1];
      return {
        id: `conv_${channel}_${i + 1}`,
        platform: channel,
        status: conv.temp === 'hot' ? 'calificado' : 'en_progreso',
        unreadCount: conv.aiPaused ? 0 : (Math.random() > 0.6 ? randomInt(1, 3) : 0),
        aiEnabled: !conv.aiPaused,
        ai_mode: conv.aiPaused ? 'manual' : 'automatic',
        aiPaused: conv.aiPaused || false,
        pauseReason: conv.pauseReason || null,
        assignedTo: null,
        contact: {
          subscriber_id: `${7000000000 + i}`,
          first_name, last_name, color,
          phone: channel === 'whatsapp' ? `+595 9${randomInt(71,99)} ${randomInt(100000,999999)}` : null,
          instagram_id: channel === 'instagram' ? `${17841400000000000 + i}` : null,
          whatsapp_phone: channel === 'whatsapp' ? `+595 9${randomInt(71,99)} ${randomInt(100000,999999)}` : null,
          email: `${first_name.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com.py`,
          last_interaction_at: new Date(now - randomInt(10, 180) * 60 * 1000).toISOString(),
          status: 'active',
          custom_fields: { empresa: company, rubro: 'Industrial', ciudad: pick(['Asunción', 'Luque', 'San Lorenzo', 'Ciudad del Este']) },
          tags: conv.temp === 'hot' ? ['lead_caliente', 'cotizacion'] : ['consulta', 'seguimiento'],
          leadScore: conv.score,
          temperature: conv.temp,
        },
        lastMessage: { text: lastMsg.text, timestamp: new Date(now - randomInt(5, 120) * 60 * 1000).toISOString(), sender: conv.msgs.length % 2 === 0 ? 'user' : 'ai' },
        messages,
      };
    });
}

// Generador de conversaciones por canal
export function generateFakeChannelConversations(channel, count = 15) {
  // Zamphiropolos-specific fixed conversations
  if (CLIENT_CONFIG.businessName && CLIENT_CONFIG.businessName.includes('Zamphiropolos')) {
    const zamphConvs = buildZamphConversations(channel);
    if (zamphConvs.length > 0) return zamphConvs;
  }

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