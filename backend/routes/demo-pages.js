import express from 'express';
import supabase from '../config/supabase.js';
import { CLIENT_CONFIG } from '../config/client-config.js';

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────

const FIRST_NAMES = ['María', 'Carlos', 'Ana', 'Luis', 'Rosa', 'Pedro', 'Carmen', 'José', 'Laura', 'Miguel', 'Sofía', 'Diego', 'Patricia', 'Fernando', 'Lorena', 'Héctor', 'Verónica'];
const LAST_NAMES = ['González', 'Benítez', 'Villalba', 'Cabrera', 'Cardozo', 'Franco', 'Mendoza', 'Ramírez', 'Torres', 'López', 'Fernández', 'Sánchez', 'Flores', 'Rodríguez', 'Silva'];
const PLATFORMS = ['instagram', 'whatsapp', 'facebook'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generatePhone() {
  const prefix = pick(['971', '981', '991', '961', '972', '982']);
  return `+595 ${prefix} ${randomInt(100000, 999999)}`;
}

function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

/** Returns a Date offset by `days` from today at a random hour between hourMin-hourMax in PY timezone concept */
function dateOffset(days, hourMin = 0, hourMax = 23) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(randomInt(hourMin, hourMax), randomInt(0, 59), 0, 0);
  return d.toISOString();
}

/** Returns a random date within the last `maxDays` days */
function recentDate(maxDays = 7) {
  return dateOffset(-randomInt(0, maxDays));
}

// ─── Zamphiropolos-specific data ─────────────────────────────

const ZAMPH_COMPANIES = ['Lácteos del Sur', 'Frigorífico Nacional', 'Farmacia Central', 'Cervecería Asunción', 'Banco Regional', 'Yerbatera Campesina', 'Laboratorio Catedral', 'Textil Guaraní', 'Agrosol Paraguay', 'Embotelladora del Este', 'Coop. Chortitzer', 'Seltz', 'Azucarera Iturbe'];
const ZAMPH_NAMES = ['María Fernández', 'Roberto Giménez', 'Carolina Benítez', 'Luis Aquino', 'Jorge Mendoza', 'Patricia López', 'Diego Villalba', 'Marcela Acosta', 'Fernando Martínez', 'Gabriela Insfrán', 'Ricardo Bogado', 'Elena Duarte', 'Silvia Cañete'];
const ZAMPH_ORDER_ITEMS = [
  { product_name: 'Etiquetas Adhesivas', quantity: 10000, unit_price: 450 },
  { product_name: 'Etiquetas Termocontraíbles', quantity: 5000, unit_price: 680 },
  { product_name: 'Book Label', quantity: 50000, unit_price: 320 },
  { product_name: 'Etiquetas para Refrigerados', quantity: 8000, unit_price: 520 },
  { product_name: 'Hologramas de Seguridad', quantity: 500, unit_price: 3500 },
  { product_name: 'Cintas Void de Seguridad', quantity: 1000, unit_price: 1200 },
  { product_name: 'Packaging Personalizado', quantity: 2000, unit_price: 2800 },
  { product_name: 'Hang Tag', quantity: 5000, unit_price: 380 },
  { product_name: 'Papelería Corporativa', quantity: 3000, unit_price: 450 },
  { product_name: 'Wrap Around', quantity: 15000, unit_price: 280 },
  { product_name: 'Precinto Termocontraíble', quantity: 20000, unit_price: 180 },
  { product_name: 'Cheques de Seguridad', quantity: 500, unit_price: 8500 },
];
const ZAMPH_APPT_REASONS = [
  'Reunión cotización etiquetas', 'Presentación hologramas de seguridad', 'Revisión diseño packaging',
  'Entrega muestras termocontraíbles', 'Cotización cheques de seguridad', 'Renovación contrato anual',
  'Revisión de artes finales', 'Presentación factura electrónica', 'Reunión book labels farmacéutica',
  'Muestra etiquetas refrigerados',
];

function isZamph() { return CLIENT_CONFIG.businessName && CLIENT_CONFIG.businessName.includes('Zamphiropolos'); }

// ─── PEDIDOS / ORDERS ───────────────────────────────────────

// Cached per-request product list so /orders and /orders/stats use the same data shape
let cachedOrders = null;
let cachedOrdersAt = 0;
const ORDER_CACHE_TTL = 5000; // 5s — keeps stats consistent with list within same page load

async function buildOrders() {
  if (cachedOrders && Date.now() - cachedOrdersAt < ORDER_CACHE_TTL) return cachedOrders;

  // Pull real products from Supabase for realistic items
  const { data: products } = await supabase
    .from('products')
    .select('name, price, currency, image_urls')
    .eq('is_active', true)
    .limit(20);

  const productList = products && products.length > 0
    ? products
    : [
        { name: 'Producto Demo 1', price: 150000, currency: 'Gs', image_urls: [] },
        { name: 'Producto Demo 2', price: 85000, currency: 'Gs', image_urls: [] },
        { name: 'Producto Demo 3', price: 220000, currency: 'Gs', image_urls: [] },
      ];

  // Status distribution as specified
  const statuses = [
    'pending_confirmation', 'pending_confirmation', 'pending_confirmation',
    'confirmed', 'confirmed', 'confirmed', 'confirmed',
    'preparing', 'preparing', 'preparing',
    'ready_to_ship', 'ready_to_ship',
    'in_transit', 'in_transit',
    'delivered', 'delivered', 'delivered',
    'cancelled'
  ];

  const count = isZamph() ? randomInt(18, 22) : randomInt(15, 20);
  const orders = [];

  // Zamphiropolos status distribution: more confirmed/preparing
  const zamphStatuses = [
    'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed',
    'preparing', 'preparing', 'preparing', 'preparing', 'preparing',
    'pending_confirmation', 'pending_confirmation', 'pending_confirmation', 'pending_confirmation',
    'delivered', 'delivered', 'delivered',
    'in_transit', 'in_transit',
    'ready_to_ship', 'ready_to_ship',
  ];

  for (let i = 0; i < count; i++) {
    let items;
    let customerName;

    if (isZamph()) {
      // Pick 1-2 Zamphiropolos items with B2B quantities
      const itemCount = randomInt(1, 2);
      items = [];
      for (let j = 0; j < itemCount; j++) {
        const item = pick(ZAMPH_ORDER_ITEMS);
        const qtyMultiplier = pick([0.5, 1, 1.5, 2, 3]);
        items.push({
          product_name: item.product_name,
          quantity: Math.round(item.quantity * qtyMultiplier),
          unit_price: item.unit_price,
          currency: 'Gs',
        });
      }
      customerName = `${pick(ZAMPH_NAMES)} — ${pick(ZAMPH_COMPANIES)}`;
    } else {
      const itemCount = randomInt(1, 3);
      items = [];
      for (let j = 0; j < itemCount; j++) {
        const prod = pick(productList);
        const qty = randomInt(1, 2);
        items.push({
          product_name: prod.name,
          quantity: qty,
          unit_price: prod.price,
          currency: prod.currency || 'Gs',
          image_url: prod.image_urls?.[0] || null
        });
      }
      customerName = randomName();
    }

    const total = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
    const status = isZamph() ? (zamphStatuses[i] || pick(zamphStatuses)) : (statuses[i] || pick(statuses));
    const createdAt = recentDate(7);

    orders.push({
      order_id: `ORD-${String(1000 + i).slice(1)}`,
      customer_name: customerName,
      phone: generatePhone(),
      platform: pick(PLATFORMS),
      items,
      total_amount: total,
      currency: 'Gs',
      status,
      delivery_type: isZamph() ? 'pickup' : pick(['pickup', 'delivery']),
      delivery_address: !isZamph() && status !== 'cancelled' && Math.random() > 0.4 ? `${pick(['Av. Mariscal López', 'Calle Palma', 'Av. España', 'Calle Mcal. Estigarribia', 'Av. Eusebio Ayala'])} ${randomInt(100, 3500)}` : null,
      created_at: createdAt,
      updated_at: createdAt
    });
  }

  // Sort newest first
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  cachedOrders = orders;
  cachedOrdersAt = Date.now();
  return orders;
}

// GET /api/orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await buildOrders();
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error generando órdenes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/stats
router.get('/orders/stats', async (req, res) => {
  try {
    const orders = await buildOrders();
    const today = new Date().toISOString().slice(0, 10);
    const deliveredToday = orders.filter(o => o.status === 'delivered' && o.created_at.slice(0, 10) === today);

    res.json({
      success: true,
      data: {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending_confirmation').length,
        in_progress: orders.filter(o => ['confirmed', 'preparing', 'ready_to_ship', 'in_transit'].includes(o.status)).length,
        delivered_today: deliveredToday.length,
        revenue_today: deliveredToday.reduce((s, o) => s + o.total_amount, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const orders = await buildOrders();
    const order = orders.find(o => o.order_id === req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/orders/:id/status
router.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending_confirmation', 'confirmed', 'preparing', 'ready_to_ship', 'in_transit', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Status inválido. Opciones: ${validStatuses.join(', ')}` });
  }
  res.json({
    success: true,
    message: `Orden ${req.params.id} actualizada a "${status}"`,
    data: { order_id: req.params.id, status, updated_at: new Date().toISOString() }
  });
});

// ─── CITAS / APPOINTMENTS ───────────────────────────────────

function buildAppointments() {
  const reasons = isZamph() ? ZAMPH_APPT_REASONS : [
    'Consulta de productos', 'Ver catálogo presencial', 'Prueba de anillos',
    'Asesoría personalizada', 'Retiro de pedido', 'Ajuste de medidas',
    'Selección de alianzas', 'Presupuesto personalizado', 'Entrega especial',
    'Consulta de diseño a medida'
  ];

  const slots = [
    '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  // Distribution: 3 today, 2 tomorrow, 3 this week (days 2-6), 2 past
  const dayOffsets = [
    0, 0, 0,          // today
    1, 1,              // tomorrow
    randomInt(2, 6), randomInt(2, 6), randomInt(2, 6),  // this week
    -randomInt(1, 3), -randomInt(1, 5)                   // past
  ];

  const appointments = dayOffsets.map((dayOff, i) => {
    const isPast = dayOff < 0;
    const time = pick(slots);
    const d = new Date();
    d.setDate(d.getDate() + dayOff);
    const dateStr = d.toISOString().slice(0, 10);

    let status;
    if (isPast) {
      status = Math.random() > 0.3 ? 'completed' : 'cancelled';
    } else {
      status = Math.random() > 0.15 ? 'scheduled' : 'cancelled';
    }

    return {
      appointment_id: `APT-${String(100 + i).slice(1)}`,
      client_name: isZamph() ? `${pick(ZAMPH_NAMES)} — ${pick(ZAMPH_COMPANIES)}` : randomName(),
      phone: generatePhone(),
      date: dateStr,
      time,
      status,
      reason: pick(reasons),
      platform: pick(PLATFORMS),
      created_at: recentDate(7)
    };
  });

  // Sort by date+time ascending
  appointments.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return appointments;
}

// GET /api/appointments
router.get('/appointments', (req, res) => {
  res.json({ success: true, data: buildAppointments() });
});

// GET /api/appointments/stats
router.get('/appointments/stats', (req, res) => {
  const appts = buildAppointments();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const scheduled = appts.filter(a => a.status === 'scheduled');

  res.json({
    success: true,
    data: {
      today: scheduled.filter(a => a.date === today).length,
      tomorrow: scheduled.filter(a => a.date === tomorrow).length,
      this_week: scheduled.length,
      total_scheduled: scheduled.length
    }
  });
});

// ─── NOTIFICACIONES ─────────────────────────────────────────

function buildNotifications() {
  const types = ['appointment_reminder', 'order_update', 'custom'];
  const templates = {
    appointment_reminder: [
      'Recordatorio: Tu cita es mañana a las {time}',
      'Hola {name}, te recordamos tu cita programada',
      'No olvides tu cita de {reason}'
    ],
    order_update: [
      'Tu pedido {order} está en camino',
      'Tu pedido {order} fue confirmado',
      'Tu pedido {order} está listo para retiro'
    ],
    custom: [
      'Tenemos nuevos productos en catálogo',
      'Promoción especial solo por hoy',
      'Gracias por tu compra, {name}'
    ]
  };

  // Status distribution: 5 sent, 3 pending, 2 failed, rest cancelled
  const statusDist = [
    'sent', 'sent', 'sent', 'sent', 'sent',
    'pending', 'pending', 'pending',
    'failed', 'failed',
    'cancelled', 'cancelled', 'cancelled', 'cancelled', 'cancelled'
  ];

  const count = randomInt(10, 15);
  const notifications = [];

  for (let i = 0; i < count; i++) {
    const type = pick(types);
    const name = randomName();
    const messageTemplates = templates[type];
    let message = pick(messageTemplates);
    message = message.replace('{name}', name.split(' ')[0]);
    message = message.replace('{time}', pick(['09:00', '10:00', '14:00', '16:00']));
    message = message.replace('{reason}', pick(['consulta', 'retiro', 'asesoría']));
    message = message.replace('{order}', `ORD-${randomInt(100, 999)}`);

    notifications.push({
      notification_id: `NTF-${String(100 + i).slice(1)}`,
      type,
      recipient_name: name,
      recipient_phone: generatePhone(),
      platform: pick(PLATFORMS),
      message,
      status: statusDist[i] || pick(['sent', 'cancelled']),
      scheduled_at: recentDate(7),
      sent_at: statusDist[i] === 'sent' ? recentDate(7) : null,
      created_at: recentDate(7)
    });
  }

  notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return notifications;
}

// GET /api/notifications
router.get('/notifications', (req, res) => {
  res.json({ success: true, data: buildNotifications() });
});

// GET /api/notifications/stats
router.get('/notifications/stats', (req, res) => {
  const notifs = buildNotifications();
  const sent = notifs.filter(n => n.status === 'sent').length;
  const pending = notifs.filter(n => n.status === 'pending').length;
  const total = notifs.length;

  res.json({
    success: true,
    data: {
      total_sent: sent,
      total_pending: pending,
      success_rate: total > 0 ? Math.round((sent / total) * 100) : 0
    }
  });
});

// ─── ALERTS (IA pausada) ────────────────────────────────────

function buildAlerts() {
  const pauseReasons = [
    'Cliente solicitó hablar con humano',
    'Consulta compleja fuera del scope del agente',
    'Error en respuesta detectado',
    'Cliente frustrado — escalado automático',
    'Solicitud de devolución'
  ];

  const count = randomInt(3, 5);
  const alerts = [];

  for (let i = 0; i < count; i++) {
    alerts.push({
      alert_id: `ALR-${String(100 + i).slice(1)}`,
      user_id: `user_${randomInt(1000, 9999)}`,
      name: randomName(),
      platform: pick(PLATFORMS),
      paused_at: dateOffset(0, -randomInt(1, 8)),
      reason: pick(pauseReasons),
      conversation_preview: pick([
        'No entiendo, quiero hablar con alguien real',
        'Esto no es lo que pregunté',
        'Necesito ayuda con mi devolución',
        'Pueden atenderme por favor?',
        'El bot me respondió cualquier cosa'
      ])
    });
  }

  alerts.sort((a, b) => new Date(b.paused_at) - new Date(a.paused_at));
  return alerts;
}

// GET /api/alerts
router.get('/alerts', (req, res) => {
  res.json({ success: true, data: buildAlerts() });
});

// POST /api/alerts/:id/resume
router.post('/alerts/:id/resume', (req, res) => {
  res.json({
    success: true,
    message: `IA reactivada para alerta ${req.params.id}`,
    data: { alert_id: req.params.id, resumed_at: new Date().toISOString() }
  });
});

export default router;
