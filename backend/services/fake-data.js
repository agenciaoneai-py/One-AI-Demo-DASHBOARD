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

export function generateFakeStats() {
  // Métricas que cambian ligeramente cada vez
  const base = {
    totalConversations: 1248,
    leadsCalificados: 342,
    citasAgendadas: 58,
    conversionRate: 24.5,
    activeNow: Math.floor(Math.random() * 15) + 8, // 8-22 usuarios activos
  };

  // Pequeñas variaciones
  return {
    totalConversations: base.totalConversations + Math.floor(Math.random() * 5),
    leadsCalificados: base.leadsCalificados + Math.floor(Math.random() * 3),
    citasAgendadas: base.citasAgendadas + Math.floor(Math.random() * 2),
    conversionRate: (base.conversionRate + (Math.random() - 0.5) * 0.5).toFixed(1),
    activeNow: base.activeNow,
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