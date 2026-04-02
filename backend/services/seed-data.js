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
export async function seedFakeData(businessName, agentName) {
  const contactCount = randomInt(8, 12);
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
    do {
      firstName = pick(PARAGUAYAN_FIRST_NAMES);
      lastName = pick(PARAGUAYAN_LAST_NAMES);
      fullName = `${firstName} ${lastName}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const temp = temperatures[i] || pick(['warm', 'cold']);
    const platform = pick(PLATFORMS);

    // Engagement score correlates with temperature
    const engagementRanges = { hot: [70, 95], warm: [40, 69], cold: [20, 39], closed: [50, 85] };
    const [eMin, eMax] = engagementRanges[temp];
    const engagementScore = randomInt(eMin, eMax);

    // Map temperature to lead_quality and status
    const qualityMap = { hot: 'hot', warm: 'warm', cold: 'cold', closed: 'hot' };
    const statusMap = { hot: 'qualified', warm: 'active', cold: 'new', closed: 'converted' };

    const noteTemplates = [
      `Consultó por productos de ${businessName}`,
      `Interesado/a en recibir catálogo`,
      `${agentName} le envió información`,
      `Pidió precios y disponibilidad`,
      `Quiere agendar una visita`,
      `Solicitó delivery a su zona`,
      `Referido/a por otro cliente`,
      `Volvió a preguntar por stock`,
    ];

    const tagOptions = [
      'interesado', 'consulta_precio', 'delivery', 'vip',
      'regalo', 'urgente', 'seguimiento', 'referido'
    ];

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

    const lifetimeValues = { hot: randomInt(200000, 800000), warm: randomInt(50000, 200000), cold: 0, closed: randomInt(300000, 1500000) };

    contacts.push({
      name: fullName,
      phone: generatePhone(),
      email: Math.random() > 0.5 ? `${firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@gmail.com` : null,
      platform,
      status: statusMap[temp],
      lead_quality: qualityMap[temp],
      engagement_score: engagementScore,
      lifetime_value: lifetimeValues[temp],
      last_interaction_at: hoursAgo(randomInt(1, 72)),
      custom_fields: { notes, ciudad: pick(['Asunción', 'Ciudad del Este', 'Encarnación', 'San Lorenzo', 'Luque']) },
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
