import supabase from '../config/supabase.js';

const PARAGUAYAN_FIRST_NAMES = [
  'María', 'Carlos', 'Ana', 'Luis', 'Rosa', 'Pedro', 'Carmen', 'José',
  'Laura', 'Miguel', 'Sofía', 'Diego', 'Patricia', 'Fernando', 'Lorena'
];

const PARAGUAYAN_LAST_NAMES = [
  'González', 'Benítez', 'Villalba', 'Cabrera', 'Cardozo', 'Franco',
  'Mendoza', 'Ramírez', 'Torres', 'López', 'Fernández', 'Sánchez'
];

const PLATFORMS = ['instagram', 'whatsapp', 'facebook'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
  const prefix = pick(['971', '981', '991', '961', '972', '982']);
  const number = String(randomInt(100000, 999999));
  return `+595 ${prefix} ${number}`;
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

/**
 * Generates and inserts realistic demo contacts into Supabase.
 * Returns the inserted contacts.
 */
// Fixed Zamphiropolos contacts — B2B with real-sounding Paraguayan companies
const ZAMPH_CONTACTS = [
  { name: 'María Fernández', company: 'Lácteos del Sur', platform: 'whatsapp', temp: 'hot', score: 85, value: 8500000 },
  { name: 'Roberto Giménez', company: 'Frigorífico Nacional', platform: 'whatsapp', temp: 'hot', score: 90, value: 12000000 },
  { name: 'Carolina Benítez', company: 'Farmacia Central', platform: 'whatsapp', temp: 'warm', score: 72, value: 3200000 },
  { name: 'Luis Aquino', company: 'Cervecería Asunción', platform: 'whatsapp', temp: 'hot', score: 88, value: 6800000 },
  { name: 'Ana Rojas', company: 'Cosmética Natural PY', platform: 'instagram', temp: 'warm', score: 65, value: 2100000 },
  { name: 'Jorge Mendoza', company: 'Banco Regional', platform: 'whatsapp', temp: 'hot', score: 92, value: 15000000 },
  { name: 'Patricia López', company: 'Yerbatera Campesina', platform: 'facebook', temp: 'warm', score: 70, value: 4500000 },
  { name: 'Diego Villalba', company: 'Laboratorio Catedral', platform: 'whatsapp', temp: 'hot', score: 95, value: 18000000 },
  { name: 'Marcela Acosta', company: 'Textil Guaraní', platform: 'instagram', temp: 'warm', score: 68, value: 1800000 },
  { name: 'Fernando Martínez', company: 'Agrosol Paraguay', platform: 'whatsapp', temp: 'hot', score: 93, value: 22000000 },
  { name: 'Gabriela Insfrán', company: 'Embotelladora del Este', platform: 'whatsapp', temp: 'warm', score: 74, value: 5500000 },
  { name: 'Ricardo Bogado', company: 'Coop. Chortitzer', platform: 'facebook', temp: 'hot', score: 87, value: 9800000 },
  { name: 'Silvia Cañete', company: 'Azucarera Iturbe', platform: 'whatsapp', temp: 'cold', score: 35, value: 0 },
  { name: 'Ramón Espínola', company: 'Maquila Export', platform: 'whatsapp', temp: 'cold', score: 28, value: 0 },
  { name: 'Elena Duarte', company: 'Seltz', platform: 'whatsapp', temp: 'hot', score: 91, value: 14000000 },
];

export async function seedFakeData(businessName, agentName) {
  const isZamph = businessName && businessName.includes('Zamphiropolos');
  const contactCount = isZamph ? ZAMPH_CONTACTS.length : randomInt(8, 12);
  const usedNames = new Set();
  const contacts = [];

  // Temperature distribution: ~3 hot, ~4 warm, ~3 cold, rest closed
  const temperatures = [
    'hot', 'hot', 'hot',
    'warm', 'warm', 'warm', 'warm',
    'cold', 'cold', 'cold',
    'closed', 'closed'
  ];

  for (let i = 0; i < contactCount; i++) {
    let firstName, lastName, fullName;

    if (isZamph) {
      const zc = ZAMPH_CONTACTS[i];
      const parts = zc.name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
      fullName = zc.name;
    } else {
      do {
        firstName = pick(PARAGUAYAN_FIRST_NAMES);
        lastName = pick(PARAGUAYAN_LAST_NAMES);
        fullName = `${firstName} ${lastName}`;
      } while (usedNames.has(fullName));
    }
    usedNames.add(fullName);

    const temp = isZamph ? ZAMPH_CONTACTS[i].temp : (temperatures[i] || pick(['warm', 'cold']));
    const platform = isZamph ? ZAMPH_CONTACTS[i].platform : pick(PLATFORMS);

    // Engagement score correlates with temperature
    const engagementScore = isZamph ? ZAMPH_CONTACTS[i].score : (() => {
      const engagementRanges = { hot: [70, 95], warm: [40, 69], cold: [20, 39], closed: [50, 85] };
      const [eMin, eMax] = engagementRanges[temp];
      return randomInt(eMin, eMax);
    })();

    // Map temperature to lead_quality and status
    const qualityMap = { hot: 'hot', warm: 'warm', cold: 'cold', closed: 'hot' };
    const statusMap = { hot: 'qualified', warm: 'active', cold: 'new', closed: 'converted' };

    const noteTemplates = isZamph ? [
      `Cotización de etiquetas para ${ZAMPH_CONTACTS[i]?.company || 'su empresa'}`,
      `Consulta de packaging personalizado`,
      `Revisión de diseño de etiquetas`,
      `Pedido de hologramas de seguridad`,
      `Solicitud de muestras de productos`,
      `Reunión comercial agendada`,
      `Seguimiento de cotización pendiente`,
      `Renovación de contrato anual`,
    ] : [
      `Consultó por productos de ${businessName}`,
      `Interesado/a en recibir catálogo`,
      `${agentName} le envió información`,
      `Pidió precios y disponibilidad`,
      `Quiere agendar una visita`,
      `Solicitó delivery a su zona`,
      `Referido/a por otro cliente`,
      `Volvió a preguntar por stock`,
    ];

    const tagOptions = isZamph
      ? ['cotizacion', 'etiquetas', 'packaging', 'seguridad', 'vip', 'urgente', 'seguimiento', 'cliente_activo']
      : ['interesado', 'consulta_precio', 'delivery', 'vip', 'regalo', 'urgente', 'seguimiento', 'referido'];

    // 1-2 notes with timestamps
    const notes = [];
    const noteCount = randomInt(1, 2);
    for (let n = 0; n < noteCount; n++) {
      notes.push({
        text: pick(noteTemplates),
        date: hoursAgo(randomInt(2, 168))
      });
    }

    // 1-3 tags
    const tagCount = randomInt(1, 3);
    const shuffled = [...tagOptions].sort(() => 0.5 - Math.random());
    const tags = shuffled.slice(0, tagCount);

    const lifetimeValues = isZamph
      ? { hot: ZAMPH_CONTACTS[i]?.value || randomInt(5000000, 20000000), warm: randomInt(1000000, 5000000), cold: 0, closed: randomInt(8000000, 25000000) }
      : { hot: randomInt(200000, 800000), warm: randomInt(50000, 200000), cold: 0, closed: randomInt(300000, 1500000) };

    const emailAddr = isZamph
      ? `${firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@${(ZAMPH_CONTACTS[i]?.company || 'empresa').toLowerCase().replace(/[^a-z0-9]/g, '')}.com.py`
      : (Math.random() > 0.5 ? `${firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@gmail.com` : null);

    contacts.push({
      name: fullName,
      phone: generatePhone(),
      email: emailAddr,
      platform,
      status: statusMap[temp],
      lead_quality: qualityMap[temp],
      engagement_score: engagementScore,
      lifetime_value: lifetimeValues[temp],
      last_interaction_at: hoursAgo(randomInt(1, 72)),
      custom_fields: isZamph
        ? { notes, empresa: ZAMPH_CONTACTS[i]?.company, ciudad: pick(['Asunción', 'Luque', 'San Lorenzo', 'Ciudad del Este']) }
        : { notes, ciudad: pick(['Asunción', 'Ciudad del Este', 'Encarnación', 'San Lorenzo', 'Luque']) },
      tags // stored temporarily, inserted into contact_tags after
    });
  }

  // Insert contacts (without the tags field which goes to a separate table)
  const contactRows = contacts.map(({ tags, ...rest }) => rest);
  const { data: inserted, error: contactError } = await supabase
    .from('contacts')
    .insert(contactRows)
    .select('id, name');

  if (contactError) {
    throw new Error(`Error insertando contactos: ${contactError.message}`);
  }

  // Insert contact tags
  if (inserted && inserted.length > 0) {
    const tagRows = [];
    inserted.forEach((contact, idx) => {
      const contactTags = contacts[idx].tags || [];
      contactTags.forEach(tag => {
        tagRows.push({
          contact_id: contact.id,
          tag,
          auto_generated: false
        });
      });
    });

    if (tagRows.length > 0) {
      const { error: tagError } = await supabase
        .from('contact_tags')
        .insert(tagRows);

      if (tagError) {
        console.error('⚠️ Error insertando tags (no crítico):', tagError.message);
      }
    }
  }

  return {
    contactsInserted: inserted?.length || 0,
    contacts: inserted || []
  };
}
