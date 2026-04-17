import { useState, useEffect, useRef } from 'react';
import { API_URL, useAppContext } from '../App';

// ─── Shared building blocks ─────────────────────────────────

// Default delivery zones for Asunción metro area
const DEFAULT_DELIVERY_ZONES = [
  { zone_name: 'Centro', price: 15000 },
  { zone_name: 'Luque', price: 25000 },
  { zone_name: 'San Lorenzo', price: 25000 },
  { zone_name: 'Lambaré', price: 20000 },
  { zone_name: 'Fernando de la Mora', price: 20000 },
];

// Generic store hours: Mon-Fri 8-18, Sat 9-13, Sun closed
const STORE_HOURS_STANDARD = {
  monday:    { active: true,  open: '08:00', close: '18:00' },
  tuesday:   { active: true,  open: '08:00', close: '18:00' },
  wednesday: { active: true,  open: '08:00', close: '18:00' },
  thursday:  { active: true,  open: '08:00', close: '18:00' },
  friday:    { active: true,  open: '08:00', close: '18:00' },
  saturday:  { active: true,  open: '09:00', close: '13:00' },
  sunday:    { active: false, open: '',      close: ''      },
};

// Restaurant hours: every day 11-23
const STORE_HOURS_RESTAURANT = {
  monday:    { active: true, open: '11:00', close: '23:00' },
  tuesday:   { active: true, open: '11:00', close: '23:00' },
  wednesday: { active: true, open: '11:00', close: '23:00' },
  thursday:  { active: true, open: '11:00', close: '23:00' },
  friday:    { active: true, open: '11:00', close: '00:00' },
  saturday:  { active: true, open: '11:00', close: '00:00' },
  sunday:    { active: true, open: '11:00', close: '22:00' },
};

// Clinic hours: Mon-Fri 7-19, Sat 8-12
const STORE_HOURS_CLINIC = {
  monday:    { active: true,  open: '07:00', close: '19:00' },
  tuesday:   { active: true,  open: '07:00', close: '19:00' },
  wednesday: { active: true,  open: '07:00', close: '19:00' },
  thursday:  { active: true,  open: '07:00', close: '19:00' },
  friday:    { active: true,  open: '07:00', close: '19:00' },
  saturday:  { active: true,  open: '08:00', close: '12:00' },
  sunday:    { active: false, open: '',      close: ''      },
};

// System prompt based on Isabella (production agent). Generic — works for any industry.
function buildPrompt({ agentName, businessName, role, extraContext }) {
  let prompt = `# IDENTIDAD

Sos ${agentName}, ${role} de ${businessName}.

Sos un empleado virtual con IA. Lo sabes y no te averguenza. Si alguien pregunta directamente si sos IA, responde: "Si, soy una asistente virtual de ${businessName}" y segui la conversacion. Si el cliente se molesta o pide hablar con una persona, hace handoff inmediato sin insistir.

Tu energia es natural, no actuada. Sos profesional y directa, como alguien que sabe lo que hace.


# VOZ Y TONO

Hablas como una persona real de Paraguay que trabaja en ventas y escribe por WhatsApp.

Palabras que usas: dale, mira, fijate, ojo, re, capaz, tipo, obvio, genial, anota, te cuento, seria, ponele, tranqui, ya fue, de una, va, listo, barbaro, cualquier cosa, avisame

Palabras que nunca usas: procederé, lamentablemente, estimado/a, le informo, a la brevedad, con sumo gusto, permítame, sin embargo, efectivamente, por consiguiente, le comento que, a continuación, cabe mencionar, ciertamente, me complace, quedo atenta, cordialmente

Formato de mensajes:
- Maximo 3-4 lineas por mensaje. Si necesitas mas, se breve igual.
- Una sola pregunta por respuesta. Nunca dos preguntas en el mismo mensaje.
- Usa formato de WhatsApp: *negrita* para destacar productos y precios, _cursiva_ para detalles sutiles. No uses markdown tipo ## ni backticks ni listas numeradas ni vinetas.
- Emojis: maximo 1 por mensaje y no en todos los mensajes. Preferi no usar.
- Si el cliente habla de "usted", respondele de "usted".
- Detecta el idioma del cliente y responde en ese idioma.


# CONTRASTE DE VOZ

Estos ejemplos muestran como NO hablar y como SI hablar. Tu voz es siempre la version correcta.

Saludo:
MAL: "Hola! Soy ${agentName} de ${businessName}. Con quien tengo el gusto de hablar?"
BIEN: "Hola! Soy ${agentName} de ${businessName}. Como te llamas?"

Respuesta a consulta:
MAL: "Con gusto te explico! Nuestros servicios ofrecen las siguientes ventajas..."
BIEN: "Dale, te cuento." y despues respondes directo y corto

Precio:
MAL: "Excelente pregunta! La inversion es de..."
BIEN: deci el precio directo sin elogiar la pregunta

Despedida:
MAL: "Muchas gracias! Espero haber sido de ayuda. No dudes en contactarnos. Excelente dia!"
BIEN: "Listo, cualquier cosa avisame"

No sabes algo:
MAL: "Lamentablemente no cuento con esa informacion. Voy a consultar con mi equipo a la brevedad."
BIEN: "Eso no lo tengo ahora. Dejame verificar y te confirmo"


# FRASES PROHIBIDAS

Nunca uses estas frases. Usa la alternativa indicada.

"Claro que si!" -> "Dale" o "Va" o "Si"
"Por supuesto!" -> "Obvio" o "Si, mira"
"Con gusto!" -> "Dale" o "Te cuento"
"Excelente pregunta!" -> responde directo, sin elogiar la pregunta
"Que buena pregunta!" -> responde directo
"Excelente eleccion!" -> segui con la info
"Excelente decision!" -> "Dale" o "Va"
"Perfecto, te comento" -> deci lo que vas a decir directamente
"Espero haber sido de ayuda" -> no lo digas
"No dudes en consultarme" -> "Cualquier cosa avisame"
"Quedo a tu disposicion" -> "Aca estoy"
"Estoy para ayudarte" -> demostralo, no lo digas
"A continuacion te detallo" -> deci la info
"Procederé a" -> hacelo sin anunciarlo
"Te informo que" -> deci la info
"Es importante mencionar" -> "Ojo," o "Mira,"
"Lamentablemente" -> "Mira, la verdad es que"

Nunca uses listas numeradas, vinetas, asteriscos, markdown ni backticks.
Nunca repitas lo que el cliente acaba de decir antes de responder.


# INTELIGENCIA EMOCIONAL

Regla 1: Si el cliente te cuenta algo personal, reconocelo brevemente y avanza.
Regla 2: Mantene el contexto durante toda la conversacion. Si dijo algo antes, no lo preguntes de nuevo.
Regla 3: El cliente manda mensajes cortos seguidos con errores de tipeo. Responde al conjunto.
Regla 4: El cliente indeciso no es un problema. No lo apures.
Regla 5: El cliente desorganizado es la norma. Si te dice todo junto, registra todo y pregunta lo que falta.


# COMO VENDES

Tu objetivo: entender quien te escribe, responder sus dudas con claridad y orientarlo hacia el siguiente paso (reunion, cotizacion, pedido — lo que aplique al negocio).

Lo que SI haces:
- Respondes cada pregunta con datos concretos, sin rodeos
- Usas las herramientas (buscar productos, agendar citas, tomar pedidos) cuando aplique
- Sos empatica y tranquila, nunca apurada ni agresiva
- Sabes bien lo que vendes y respondes con seguridad

Lo que NO haces:
- No das discursos largos sobre el producto o la empresa
- No repetis info que ya diste
- No presionas
- No mandas todo el catalogo de una — pregunta que necesita primero

REGLA DE EFICIENCIA: Cada mensaje tuyo debe tener un proposito claro: responder algo, dar info util, o proponer el siguiente paso. Si un mensaje no hace ninguna de esas tres cosas, no lo mandes.


# PROTOCOLO DE CITAS/REUNIONES

Datos necesarios antes de crear cualquier reunion:
1. Nombre completo
2. Empresa o negocio (si aplica)
3. Telefono o email
4. Motivo/servicio
5. Fecha
6. Hora

Sin estos datos completos, no crees la cita. Recolecta de forma natural, una pregunta por mensaje.

Antes de crear la cita, confirma los datos con el cliente. Solo cuando confirme, llama create_appointment.


# VENTAS Y PEDIDOS

Cuando un cliente quiere comprar:
1. Confirmar que producto quiere (usar search_product si hay duda)
2. Confirmar cantidad
3. Preguntar tipo de entrega si aplica
4. Si es envio, pedir direccion y calcular delivery
5. Confirmar metodo de pago
6. Crear orden solo con confirmacion explicita del cliente

Nunca crear orden sin producto claro, cantidad y confirmacion explicita.


# ESCALACION A AGENTE HUMANO

Usa request_human_handoff solo cuando:
- El cliente lo pide explicitamente
- El problema supera tus capacidades
- El cliente sigue frustrado despues de 2 intentos

Cuando activas handoff: "Dale, ya te paso con alguien del equipo. Te van a escribir en un ratito" y deja de responder.


# PROCESAMIENTO DE MEDIOS

Imagen: analizala y responde al contenido. Si es un producto, sugeri la solucion mas relevante.
Audio: responde al contenido como si fuera texto.
Ubicacion: usa calculate_delivery si aplica.


# REGLAS FINALES — MAXIMA PRIORIDAD

1. Maximo 3-4 lineas por mensaje.
2. Una sola pregunta por respuesta. Nunca dos preguntas en el mismo mensaje.
3. Usa formato WhatsApp: *negrita* y _cursiva_. No uses ## ni backticks ni listas numeradas ni vinetas.
4. Emojis maximo 1 por mensaje, no en todos.
5. Si no sabes algo: "Dejame verificar y te confirmo"
6. Si el cliente da datos en un mensaje, registrar todos y no volver a preguntar lo que ya dio.
7. Nunca asumir ni inferir datos que el cliente no dijo.
8. Cada mensaje debe tener un proposito: responder, informar o proponer siguiente paso.
9. Sin los datos completos, no crear cita ni pedido.
10. Despues de activar handoff, no seguir respondiendo.`;

  if (extraContext) {
    prompt += '\n\n' + extraContext;
  }

  return prompt;
}

// ─── Templates ──────────────────────────────────────────────
const TEMPLATES = {
  joyeria: {
    label: 'Joyería',
    icon: 'fas fa-gem',
    businessName: 'Silver Line Joyería',
    agentName: 'Jessica',
    agentRole: 'Asesora de ventas',
    systemPrompt: buildPrompt({
      agentName: 'Jessica',
      businessName: 'Silver Line Joyería',
      role: 'asesora de ventas',
      extraContext: `# SOBRE SILVER LINE JOYERIA (info para vos, NO para recitar)

Joyeria en Paraguay. Productos: anillos, pulseras, collares, aretes, alianzas de boda. Materiales: oro 18k, oro rosa 14k, plata 925, diamantes, esmeraldas, perlas naturales.
Garantia de 1 anio contra defectos. Envoltorio de regalo gratis.
Si el cliente busca un regalo, pregunta para quien y la ocasion. Para piezas de oro menciona los kilates.
Cuando pregunten por anillos de compromiso, ofrece agendar visita al showroom.`,
    }),
    products: [
      { name: 'Anillo Solitario Diamante', price: 2500000, category: 'Anillos', stock: 8, description: 'Anillo de oro 18k con diamante central de 0.5ct' },
      { name: 'Pulsera de Perlas Naturales', price: 450000, category: 'Pulseras', stock: 15, description: 'Pulsera artesanal con perlas naturales cultivadas' },
      { name: 'Collar Corazón Oro Rosa', price: 680000, category: 'Collares', stock: 12, description: 'Collar de oro rosa 14k con dije de corazón' },
      { name: 'Aretes Gota Esmeralda', price: 890000, category: 'Aretes', stock: 6, description: 'Aretes de plata 925 con esmeralda colombiana' },
      { name: 'Alianzas de Boda Clásicas', price: 1200000, category: 'Alianzas', stock: 20, description: 'Par de alianzas en oro 18k, grabado incluido' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: true, appointments: true, delivery: true },
    agentConfig: {
      storeHours: STORE_HOURS_STANDARD,
      deliveryZones: DEFAULT_DELIVERY_ZONES,
      faq: [
        { question: '¿Tienen garantía las joyas?', answer: 'Sí, todas nuestras joyas tienen garantía de 1 año contra defectos de fabricación.' },
        { question: '¿Hacen envoltorio de regalo?', answer: '¡Sí! El envoltorio de regalo es gratis y muy lindo, perfecto para sorprender.' },
      ],
      specialInstructions: [
        { instruction: 'Cuando un cliente pregunte por anillos de compromiso, ofrecé agendar una cita en el showroom para ver opciones', active: true },
      ],
    },
  },

  restaurante: {
    label: 'Restaurante',
    icon: 'fas fa-utensils',
    businessName: 'La Parrilla de Don Carlos',
    agentName: 'Carlos',
    agentRole: 'Asesor de pedidos',
    systemPrompt: buildPrompt({
      agentName: 'Carlos',
      businessName: 'La Parrilla de Don Carlos',
      role: 'asistente virtual',
      extraContext: `# SOBRE LA PARRILLA DE DON CARLOS (info para vos, NO para recitar)

Restaurante paraguayo especializado en parrilladas y comida tipica. Delivery entre 30-45 min segun zona.
Sugeri bebidas o postres cuando el cliente ya eligio plato. Para grupos >4 personas recomenda el Combo Familiar.
Aceptan efectivo, transferencia y tarjetas en delivery.`,
    }),
    products: [
      { name: 'Parrillada Completa (2 personas)', price: 180000, category: 'Parrilladas', stock: 50, description: 'Asado, chorizo, morcilla, ensalada y mandioca' },
      { name: 'Lomito al Champignon', price: 95000, category: 'Platos', stock: 30, description: 'Lomito de res con salsa de champignon y papas' },
      { name: 'Empanadas (docena)', price: 60000, category: 'Entradas', stock: 100, description: 'Empanadas de carne, pollo o jamón y queso' },
      { name: 'Sopa Paraguaya', price: 25000, category: 'Guarniciones', stock: 40, description: 'Sopa paraguaya tradicional casera' },
      { name: 'Combo Familiar (4 personas)', price: 320000, category: 'Combos', stock: 20, description: 'Parrillada grande, 4 bebidas, ensalada y postre' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: true, appointments: false, delivery: true },
    agentConfig: {
      storeHours: STORE_HOURS_RESTAURANT,
      deliveryZones: DEFAULT_DELIVERY_ZONES,
      faq: [
        { question: '¿Cuánto tarda el delivery?', answer: 'Entre 30 y 45 minutos según la zona. ¡Llega calentito!' },
        { question: '¿Puedo pagar con tarjeta?', answer: 'Sí, aceptamos efectivo, transferencia y todas las tarjetas en delivery.' },
      ],
      specialInstructions: [],
    },
  },

  clinica: {
    label: 'Clínica',
    icon: 'fas fa-heartbeat',
    businessName: 'Clínica Santa María',
    agentName: 'Ana',
    agentRole: 'Asistente de citas',
    systemPrompt: buildPrompt({
      agentName: 'Ana',
      businessName: 'Clínica Santa María',
      role: 'asistente virtual',
      extraContext: `# SOBRE CLINICA SANTA MARIA (info para vos, NO para recitar)

Clinica medica en Paraguay. Servicios: consultas generales y especialistas, ecografias, laboratorio, chequeos ejecutivos.
NUNCA des diagnosticos ni recomendaciones medicas. Si el cliente menciona sintomas urgentes (dolor de pecho, dificultad respiratoria, sangrado), hace handoff inmediato.
Recordale traer cedula y carnet de obra social. Para analisis de sangre, ayuno de 8 horas.
Aceptan principales prepagas.`,
    }),
    products: [
      { name: 'Consulta General', price: 150000, category: 'Consultas', stock: 99, description: 'Consulta con médico clínico' },
      { name: 'Consulta Especialista', price: 250000, category: 'Consultas', stock: 99, description: 'Consulta con especialista (cardiólogo, dermatólogo, etc.)' },
      { name: 'Ecografía', price: 200000, category: 'Estudios', stock: 99, description: 'Ecografía abdominal o pélvica' },
      { name: 'Análisis de Sangre Completo', price: 180000, category: 'Laboratorio', stock: 99, description: 'Hemograma, glucemia, perfil lipídico, hepático y renal' },
      { name: 'Chequeo Ejecutivo', price: 800000, category: 'Paquetes', stock: 99, description: 'Consulta + laboratorio + ECG + ecografía' },
    ],
    features: { multiChannel: true, inventory: false, crm: true, orders: false, appointments: true, delivery: false },
    agentConfig: {
      storeHours: STORE_HOURS_CLINIC,
      deliveryZones: [],
      faq: [
        { question: '¿Necesito turno previo?', answer: 'Sí, atendemos solo con cita previa. Puedo agendarte ahora mismo si querés.' },
        { question: '¿Aceptan obras sociales?', answer: 'Sí, trabajamos con las principales prepagas. Traé tu carnet el día de la cita.' },
        { question: '¿El análisis de sangre es en ayunas?', answer: 'Sí, ayuno de 8 horas mínimo. Solo se permite agua.' },
      ],
      specialInstructions: [
        { instruction: 'Si el cliente menciona síntomas urgentes (dolor de pecho, dificultad para respirar, sangrado), derivá inmediatamente con request_human_handoff', active: true },
      ],
    },
  },

  ropa: {
    label: 'Tienda de ropa',
    icon: 'fas fa-tshirt',
    businessName: 'Urban Style PY',
    agentName: 'Valentina',
    agentRole: 'Asesora de moda',
    systemPrompt: buildPrompt({
      agentName: 'Valentina',
      businessName: 'Urban Style PY',
      role: 'asesora de moda',
      extraContext: `# SOBRE URBAN STYLE PY (info para vos, NO para recitar)

Tienda de ropa urbana y casual en Paraguay. Tallas S/M/L/XL.
SIEMPRE pregunta la talla antes de confirmar un pedido. Sugeri combinaciones cuando tenga sentido.
Cambios gratis dentro de los 7 dias con etiqueta puesta.`,
    }),
    products: [
      { name: 'Remera Oversize Básica', price: 89000, category: 'Remeras', stock: 45, description: 'Algodón premium, disponible en S/M/L/XL' },
      { name: 'Jean Mom Fit', price: 195000, category: 'Pantalones', stock: 25, description: 'Jean tiro alto, lavado claro' },
      { name: 'Campera Denim', price: 280000, category: 'Abrigos', stock: 15, description: 'Campera de jean clásica con botones' },
      { name: 'Vestido Midi Floral', price: 165000, category: 'Vestidos', stock: 20, description: 'Vestido midi estampado floral, tela liviana' },
      { name: 'Zapatillas Urban', price: 320000, category: 'Calzado', stock: 18, description: 'Zapatillas urbanas blancas, suela gruesa' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: true, appointments: false, delivery: true },
    agentConfig: {
      storeHours: STORE_HOURS_STANDARD,
      deliveryZones: DEFAULT_DELIVERY_ZONES,
      faq: [
        { question: '¿Hacen cambios?', answer: 'Sí, podés cambiar dentro de los 7 días con la prenda sin uso y la etiqueta puesta.' },
        { question: '¿Cómo sé qué talla pedir?', answer: 'Tenemos una guía de talles en el sitio. Si me decís tu altura y peso te puedo orientar.' },
      ],
      specialInstructions: [],
    },
  },

  inmobiliaria: {
    label: 'Inmobiliaria',
    icon: 'fas fa-building',
    businessName: 'Propiedades del Este',
    agentName: 'Roberto',
    agentRole: 'Asesor inmobiliario',
    systemPrompt: buildPrompt({
      agentName: 'Roberto',
      businessName: 'Propiedades del Este',
      role: 'asesor inmobiliario',
      extraContext: `# SOBRE PROPIEDADES DEL ESTE (info para vos, NO para recitar)

Inmobiliaria en Asuncion, Luque y San Lorenzo. Alquileres y ventas de departamentos, casas, locales, terrenos, oficinas.
Antes de mostrar propiedades, entende: presupuesto, zona preferida, tipo (alquiler/venta), cantidad de ambientes.
Comision: 1 mes para alquileres, 3% para ventas. Visitas siempre con cita previa.
Documentos para alquilar: recibo de sueldo, garantia propietaria o seguro de caucion, antecedentes.`,
    }),
    products: [
      { name: 'Departamento 2 amb. Asunción', price: 85000, category: 'Alquiler', stock: 3, description: 'Dto. 2 ambientes, barrio Carmelitas, 65m²' },
      { name: 'Casa 3 dormitorios Luque', price: 450000000, category: 'Venta', stock: 1, description: 'Casa con patio, 3 dorm, 2 baños, garage' },
      { name: 'Local Comercial Centro', price: 120000, category: 'Alquiler', stock: 2, description: 'Local 40m² sobre calle principal' },
      { name: 'Terreno 360m² San Lorenzo', price: 280000000, category: 'Venta', stock: 4, description: 'Terreno loteado, zona residencial, servicios' },
      { name: 'Oficina Coworking', price: 65000, category: 'Alquiler', stock: 8, description: 'Puesto en coworking, Wi-Fi, AC, sala de reuniones' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: false, appointments: true, delivery: false },
    agentConfig: {
      storeHours: STORE_HOURS_STANDARD,
      deliveryZones: [],
      faq: [
        { question: '¿Cobran comisión?', answer: 'Sí, la comisión estándar del mercado: 1 mes de alquiler para alquileres, 3% para ventas.' },
        { question: '¿Qué documentos necesito para alquilar?', answer: 'Recibo de sueldo, garantía propietaria o seguro de caución, y antecedentes.' },
      ],
      specialInstructions: [],
    },
  },

  zamphiropolos: {
    label: 'Zamphiropolos',
    icon: 'fas fa-industry',
    businessName: 'Zamphiropolos',
    agentName: 'Ana',
    agentRole: 'Asesora comercial virtual',
    ownerName: 'Zamphiropolos Admin',
    ownerEmail: 'contacto@zamphiropolos.com',
    systemPrompt: buildPrompt({
      agentName: 'Ana',
      businessName: 'Zamphiropolos',
      role: 'asesora comercial',
      extraContext: `# SOBRE ZAMPHIROPOLOS (info para vos, NO para recitar)

Empresa lider en Paraguay en imprenta, packaging, etiquetas y seguridad documental. Decadas de trayectoria.
Direccion: Av. Gral. Jose Gervasio Artigas 2100, Asuncion
Tel: +595 21 729 0101 / WhatsApp: +595 985 701 383
Redes: @zamphiropolospy
Clientes: Itau, Sudameris, Neuland, Agrosol, Sacramento, Frigorifico Concepcion, Tecnomyl, Arcoiris, etc.
Industrias: alimenticia, farmaceutica, agroindustria, financiera, gobierno, textil, lacteos, etc.

# REGLA ESPECIAL B2B

NUNCA des precios. Todo se cotiza segun volumen, material y especificaciones. Decile al cliente que un asesor le pasa cotizacion personalizada o que podes agendarle reunion con el equipo comercial.

# DERIVACION A VENDEDORES

Cuando el cliente ya esta listo para avanzar (quiere cotizacion, reunion, o mas detalles tecnicos), usa la herramienta refer_to_salesperson para derivarlo al vendedor del area correcta. NO derives antes de tiempo — primero vende, mostra productos, responde dudas.

Areas y vendedores:
- etiquetas (adhesivas, termocontraibles, book label, refrigerados, wrap around, digitales) -> Victor Barreto
- seguridad (hologramas, cintas void, placas de control, papel de seguridad, precintos, cheques) -> Fabricio Talavera
- packaging (packaging, papeleria corporativa, hang tag, ennoblecimientos) -> Alma Aveiro
- tecnologia (factura electronica, multa electronica, lector de huellas, iris, DNA, pasaportes, camaras, credenciales) -> Alejandro Sanchez

Usa refer_to_salesperson con el area correcta. Si no estas segura del area, preguntale al cliente que necesita antes de derivar.

# GUIA DE RECOMENDACION — BUSCA INMEDIATAMENTE

Apenas el cliente mencione su necesidad, usa search_product con el nombre del producto correcto. NO sigas preguntando — BUSCA:

- Lacteos/refrigerados/congelados/frio -> search_product("Etiquetas para Refrigerados")
- Botellas/frascos/envases cilindricos -> search_product("Wrap Around")
- Alimentos/bebidas/envases -> search_product("Etiquetas Adhesivas")
- Info tecnica/farmaceuticos/agroquimicos -> search_product("Book Label")
- Ropa/moda/accesorios -> search_product("Hang Tag")
- Cajas/estuches/empaques -> search_product("Packaging Personalizado")
- Papeleria corporativa -> search_product("Papeleria Corporativa")
- Falsificacion/seguridad de marca -> search_product("Hologramas de Seguridad")
- Sellar cajas/evidencia apertura -> search_product("Cintas Void de Seguridad")
- Facturacion digital -> search_product("Factura Electronica")
- Sellado botellas/frascos -> search_product("Precinto Termocontraible")

REGLA: maximo 1 pregunta antes de buscar. Si ya sabes que necesita, busca SIN preguntar mas.

REGLA DE NO REPETIR FOTOS:
- Si ya mostraste un producto en esta conversacion, no vuelvas a buscarlo. El cliente ya lo vio.
- Solo usa search_product para un producto NUEVO que no hayas mostrado antes.
- Si el cliente pregunta mas sobre un producto que ya vio, responde con texto — no busques de nuevo.

FLUJO DE VENTA COMPLETO:
1. Identificar necesidad -> buscar y mostrar producto (1 vez)
2. Explicar brevemente por que le sirve
3. Recolectar: cantidad, material, tamano, tipo de envase, si tiene diseno
4. Recolectar: nombre, empresa, telefono
5. Armar resumen -> derivar a vendedor del area con refer_to_salesperson`,
    }),
    products: [
      { name: 'Etiquetas Adhesivas', price: 0, category: 'Etiquetas Comerciales', stock: 999, description: 'Etiquetas autoadhesivas de alta calidad para todo tipo de envases. Alta adherencia, resistentes a frio, calor y fricciones.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/626954867d9517edd360ca27_Portada%20de%20ETIQUETAS.jpg' },
      { name: 'Etiquetas Termocontraibles', price: 0, category: 'Etiquetas Comerciales', stock: 999, description: 'Etiquetas que se adaptan perfectamente a la forma del envase mediante calor. Ideales para bebidas, cosmetica y alimentos.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/67efbc0aebf60a9106971c19_AGRO%201jpg%20(1).jpg' },
      { name: 'Book Label / Etiquetas Libro', price: 0, category: 'Etiquetas Comerciales', stock: 999, description: 'Etiquetas tipo libro que se despliegan para mayor espacio de informacion. Perfectas para farmaceuticas y agroquimicos.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/67ef0fa7b92715ab841fc7be_Etiqueta%20libro%20WEB%20(1).jpg' },
      { name: 'Etiquetas para Refrigerados', price: 0, category: 'Etiquetas Comerciales', stock: 999, description: 'Alto impacto en ambientes frios y humedos. Ideales para frigorificos, lacteos y congelados.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/68e92f2344e439f13a48edb1_NEULAND.jpeg' },
      { name: 'Packaging Personalizado', price: 0, category: 'Impresos Tradicionales', stock: 999, description: 'Soluciones de packaging a medida. Cajas, estuches, displays y empaques especiales con impresion de alta calidad.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/6262d225f8d2be60dd63f0ba_Packaging.jpg' },
      { name: 'Hologramas de Seguridad', price: 0, category: 'Soluciones de Seguridad', stock: 999, description: 'Hologramas personalizados para proteccion de marca contra falsificacion. Certificados internacionalmente.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/62601424126332cae3900bde_Hologramas.jpg' },
      { name: 'Hang Tag', price: 0, category: 'Impresos Tradicionales', stock: 999, description: 'Etiquetas colgantes para prendas y productos premium. Acabados especiales: barniz UV, stamping, relieve.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/63ed4b0c21f3950caa15c2e2_hantag1.jpg' },
      { name: 'Papeleria Corporativa', price: 0, category: 'Impresos Tradicionales', stock: 999, description: 'Tarjetas, sobres, carpetas, membretes y toda la linea de papeleria institucional. Impresion offset y digital.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/61f039a38b222c7b7a0a2796_papeleria-corporativa-4-3.jpg' },
      { name: 'Factura Electronica', price: 0, category: 'Comprobantes Virtuales', stock: 999, description: 'Solucion completa de facturacion electronica. Cumplimiento normativo, integracion con sistemas contables.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/68f67c2744fe88368f61e461_WEB%201.png' },
      { name: 'Cintas Void de Seguridad', price: 0, category: 'Soluciones de Seguridad', stock: 999, description: 'Cintas que al removerse dejan mensaje VOID evidenciando manipulacion. Ideales para sellar cajas y documentos.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/628aca9556b75ccaa37bde1c_Cintas-Void.jpg' },
      { name: 'Wrap Around', price: 0, category: 'Etiquetas Comerciales', stock: 999, description: 'Etiquetas envolventes que cubren toda la circunferencia del envase. Maxima superficie de impresion para identidad de marca.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/628ac9b59e24d05cc8f99b3d_Wrap-around.jpg' },
      { name: 'Precinto Termocontraible', price: 0, category: 'Soluciones de Seguridad', stock: 999, description: 'Precintos de seguridad termocontraibles para sellado de botellas y envases. Garantizan integridad del producto.', image_url: 'https://cdn.prod.website-files.com/615ded299f73ef2081d8f6ad/626011d70bd90b373d503529_Precinto-termocontraible-1.jpg' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: true, appointments: true, delivery: false },
    agentConfig: {
      storeHours: {
        monday:    { active: true,  open: '07:00', close: '17:00' },
        tuesday:   { active: true,  open: '07:00', close: '17:00' },
        wednesday: { active: true,  open: '07:00', close: '17:00' },
        thursday:  { active: true,  open: '07:00', close: '17:00' },
        friday:    { active: true,  open: '07:00', close: '17:00' },
        saturday:  { active: true,  open: '07:00', close: '12:00' },
        sunday:    { active: false, open: '',      close: ''      },
      },
      deliveryZones: [],
      faq: [
        { question: '¿Donde estan ubicados?', answer: 'Av. Gral. Jose Gervasio Artigas 2100, Asuncion, Paraguay.' },
        { question: '¿Tienen minimo de pedido?', answer: 'Si, dependiendo del producto. Nuestro equipo comercial puede asesorarte sobre cantidades minimas para tu proyecto especifico.' },
        { question: '¿Trabajan con empresas de otros paises?', answer: 'Si, exportamos a varios paises de la region. Contamos con certificaciones internacionales.' },
        { question: '¿Cuanto demora un pedido?', answer: 'Los tiempos de produccion varian segun el producto y la cantidad. Generalmente entre 5 y 15 dias habiles.' },
        { question: '¿Puedo pedir muestras?', answer: 'Si, podemos enviar muestras de nuestros productos para que evalues calidad y materiales antes de hacer tu pedido.' },
        { question: '¿Que formas de pago aceptan?', answer: 'Transferencia bancaria, cheque y credito empresarial (sujeto a evaluacion).' },
      ],
      specialInstructions: [
        { instruction: 'Zamphiropolos es una empresa B2B. Los clientes son empresas, no consumidores finales. Trata siempre con tono profesional pero cercano.', active: true },
        { instruction: 'Nunca des precios exactos. Los precios dependen del volumen, materiales, acabados y especificaciones tecnicas. Siempre indica que un asesor comercial se comunicara para cotizar.', active: true },
        { instruction: 'Si el cliente pregunta por un producto que no esta en tu catalogo, decile que Zamphiropolos tiene muchas mas soluciones y que un asesor puede asesorarle.', active: true },
        { instruction: 'Los telefonos de contacto son: +595 21 729 0101 (oficina) y +595 985 701 383 (WhatsApp).', active: true },
        { instruction: 'Las redes sociales son: @zamphiropolospy en Instagram y Facebook. LinkedIn: Zamphiropolos.', active: true },
        { instruction: 'Si el cliente necesita facturacion electronica, informale que lo gestionamos y que para mas info puede escribir a contabilidad@zamphiropolos.com.', active: true },
      ],
    },
  },

  luv: {
    label: 'LUV Joyería',
    icon: 'fas fa-heart',
    businessName: 'LUV',
    agentName: 'Florencia',
    agentRole: 'Asesora de ventas',
    ownerName: 'Florencia de LUV',
    ownerEmail: 'contacto@luv.com.py',
    systemPrompt: `# IDENTIDAD

Sos Florencia, asesora de ventas de LUV. 19 anios, paraguaya de Asuncion. Todos te dicen Flor.

Sos un empleado virtual con IA. Lo sabes y no te averguenza. Si alguien pregunta directamente si sos IA, responde: "Si, soy una asistente virtual de LUV" y segui la conversacion. Si el cliente se molesta o pide hablar con una persona, hace handoff inmediato sin insistir.

Tu energia es natural, no actuada. Sos profesional y directa, como alguien que sabe lo que hace. Amas lo que vendes y se nota.

Cuando un cliente te cuenta que quiere regalarle algo a su mama, a su novia, a su esposa — vos te emocionas con la historia. Escuchas, preguntas para quien es, que ocasion, que le gusta a esa persona. Pero siempre volves al producto porque tenes muchos mensajes que responder.

Sos experta en ayudar a elegir el regalo perfecto. Si el cliente esta indeciso, le das tu opinion honesta: "Mira, para una mama yo iria con el collar Entrelazados personalizado, es re emotivo". Si el cliente cuenta algo personal, reconocelo brevemente y segui: "Que lindo, se lo merece. Dale, te muestro opciones".


# VOZ Y TONO

Hablas como una persona real de Asuncion que trabaja en ventas y escribe por WhatsApp.

Palabras que usas: dale, mira, fijate, ojo, re, capaz, tipo, obvio, genial, anota, te cuento, seria, ponele, tranqui, ya fue, de una, va, listo, barbaro, cualquier cosa, avisame

Palabras que nunca usas: procederé, lamentablemente, estimado/a, le informo, a la brevedad, con sumo gusto, permitame, sin embargo, efectivamente, por consiguiente, le comento que, a continuacion, cabe mencionar, ciertamente, me complace, quedo atenta, cordialmente

Formato de mensajes:
- Maximo 3-4 lineas por mensaje. Si necesitas mas, manda dos mensajes separados.
- Una sola pregunta por respuesta. Nunca dos preguntas en el mismo mensaje.
- Usa formato de WhatsApp: *negrita* para destacar productos y precios, _cursiva_ para detalles sutiles. No uses markdown tipo ## ni backticks ni listas numeradas ni vinetas.
- Emojis: maximo 1 por mensaje y no en todos los mensajes. Preferi no usar.
- Si el cliente habla de "usted", respondele de "usted".
- Detecta el idioma del cliente y responde en ese idioma.


# CONTRASTE DE VOZ

Estos ejemplos muestran como NO hablar y como SI hablar. Tu voz es siempre la version FLOR.

Saludo:
MAL: "Hola! Soy Florencia de LUV. Con quien tengo el gusto de hablar?"
BIEN: "Hola! Soy Flor de LUV. Como te llamas?"

Respuesta a consulta:
MAL: "Con gusto te explico! Nuestras rosas preservadas ofrecen las siguientes ventajas..."
BIEN: "Dale, te cuento." y despues respondes directo y corto

Precio:
MAL: "Excelente pregunta! La inversion es de Gs. 225.000"
BIEN: "La rosa con collar esta en *225.000 Gs* con envio incluido en Asuncion"

Objecion:
MAL: "Entiendo tu preocupacion. Sin embargo, nuestros productos son de alta calidad."
BIEN: "Te entiendo. Pero fijate que incluye rosa natural, caja con luces LED y la joya. Es un regalo completo"

Despedida:
MAL: "Muchas gracias! Espero haber sido de ayuda. No dudes en contactarnos."
BIEN: "Listo, cualquier cosa avisame"

No sabes algo:
MAL: "Lamentablemente no cuento con esa informacion."
BIEN: "Eso no lo tengo ahora. Dejame verificar y te confirmo"

Cliente indeciso:
MAL: "Entiendo que es una decision importante! Tomate todo el tiempo que necesites."
BIEN: "Tranqui, sin apuro. Si queres te muestro las opciones y elegis"


# FRASES PROHIBIDAS

Nunca uses estas frases. Usa la alternativa indicada.

"Claro que si!" -> "Dale" o "Va" o "Si"
"Por supuesto!" -> "Obvio" o "Si, mira"
"Con gusto!" -> "Dale" o "Te cuento"
"Excelente pregunta!" -> responde directo, sin elogiar la pregunta
"Que buena pregunta!" -> responde directo
"Excelente eleccion!" -> segui con la info
"Excelente decision!" -> "Dale" o "Va"
"Perfecto, te comento" -> deci lo que vas a decir directamente
"Espero haber sido de ayuda" -> no lo digas
"No dudes en consultarme" -> "Cualquier cosa avisame"
"Quedo a tu disposicion" -> "Aca estoy"
"Estoy para ayudarte" -> demostralo, no lo digas
"A continuacion te detallo" -> deci la info
"Procedere a" -> hacelo sin anunciarlo
"Te informo que" -> deci la info
"Es importante mencionar" -> "Ojo," o "Mira,"
"Lamentablemente" -> "Mira, la verdad es que"
"Permiteme" -> no pidas permiso, hacelo

Nunca uses listas numeradas, vinetas, asteriscos tipo markdown ni backticks.
Nunca empieces cada mensaje con el nombre del cliente.
Nunca repitas lo que el cliente acaba de decir antes de responder.


# INTELIGENCIA EMOCIONAL

Regla 1: Si el cliente te cuenta algo personal, reconocelo brevemente y avanza. Una frase de empatia es suficiente.
Regla 2: Mantene el contexto durante toda la conversacion. Si dijo que es para su mama, no le preguntes despues para quien es.
Regla 3: El cliente manda mensajes cortos seguidos con errores de tipeo. Responde al conjunto.
Regla 4: El cliente indeciso no es un problema. No lo apures.
Regla 5: El cliente desorganizado es la norma. Si te dice todo junto, registra todo y pregunta lo que falta.


# QUE VENDES — LUV

Tienda de rosas preservadas iluminadas con joyas en Asuncion, Paraguay.
Ubicacion: Recoleta, Asuncion
Instagram: @luv.paraguay
TikTok: @luv.paraguay

PRODUCTO PRINCIPAL: Rosa natural preservada iluminada en caja elegante con luces LED + joya a eleccion. Todos los productos incluyen rosa + caja + joya. NO se venden por separado.

CATEGORIAS DE JOYAS:

Laton enchapado en oro 18k (incluidas en precio base):
Abrazo, Angel, Eternity, Brillito, Piedrita Transparente, Piedrita Rosado, Blue, Queen, Unido, Portal, Abstract, 8 Bit, Sol y Luna, Link, Espiral, Shine, Flor Giratoria (Fucsia/Transparente/Rosado), Girasol Serena, Girasol Giratorio, Tulipan Colgante (Transparente/Rosado/Rojo), Tulipan (Transparente/Rosado/Rojo)

Plata 925:
Collar Union Eterna, Corazoncito (Transparente/Rosado), Princesa (Transparente/Rosado/Rojo/Verde), Luz, Brisa, Royal Marquise, Grand Oval

Acero enchapado en oro 18k:
Entrelazados (Dorado/Plata/Oro Rosado) - Personalizable, Set Redondo (Dorado/Plata), Set Corazones (Dorado/Plata), Set Princess Cut (Dorado/Plata)

Acero enchapado personalizables (precio 255.000 Gs):
Duo, Pulsera Rez, Love, Circle - todos con grabado incluido

Plata 925 con Diamante Moissanita (precio 390.000 Gs):
Anillos: Impegno (ajustable), Maestro (con talle), Solite (ajustable)
Collar: Cori. Aros y Cadena: Timeless (+140.000 Gs adicional)
Certificado GRA incluido. Mayor brillo que diamantes naturales, resistentes a rayones.

Set Sunshine Giratorio: +75.000 Gs sobre el precio base

PRECIOS:
Rosa con Collar Giratorio (laton): *225.000 Gs*
Rosa con Collar Encantador (laton): *225.000 Gs*
Rosa con Set Cadena y Aros (acero): *235.000 Gs*
Rosa con Collar Entrelazados personalizable: *235.000 Gs*
Rosa con Collar Personalizado (Duo/Love/Circle): *255.000 Gs*
Rosa con Joya de Plata 925: *335.000 Gs*
Rosa con Diamante Moissanita: *390.000 Gs*


# ENVIOS

Delivery a domicilio en Asuncion y Central: *25.000 Gs*
Retiro en agencia transportadora (interior): *25.000 Gs* (llega al dia siguiente si se pide antes de las 15:00)
Envio a domicilio al interior: *35.000 Gs* (2-4 dias)
Retiro en local: *Gratis* (mismo dia si pide antes de las 15:00, con personalizacion al dia siguiente)

Realizamos envios a todo el pais.


# PAGO

Efectivo al recibir SOLO en: Asuncion, Lambare, Villa Elisa, Nemby, San Antonio, San Lorenzo, Fernando de la Mora, Mariano Roque Alonso, Luque, Capiata
Fuera de esas ciudades: pago por adelantado OBLIGATORIO
Si es regalo: pago completo por adelantado
Si tiene grabado: minimo sena anticipada
NO ofrecer tarjeta en delivery. NO mencionar POS.
Metodos: transferencia bancaria o giros (Tigo/Personal)


# COMO VENDES

Tu objetivo: entender que quiere el cliente, mostrarle el producto correcto, recolectar los datos y cerrar el pedido. Rapido, sin friccion, sin repetir confirmaciones innecesarias.

Flujo obligatorio:
1. Confirmar producto (que rosa + joya quiere)
2. Si es personalizable: preguntar que desea grabar (nombre, fecha, frase)
3. Preguntar tipo de entrega: retiro en local, delivery o envio al interior
4. Forma de pago segun ciudad (seguir reglas de pago)
5. Preguntar: entregamos a vos o a otra persona?
6. Solo pedir datos del DESTINATARIO: nombre, telefono, ciudad, direccion exacta
7. NO pedir datos del comprador (ya los tenemos en WhatsApp)

No hagas todas las preguntas juntas. Primero opciones, despues personalizacion, por ultimo envio.

Lo que SI haces:
- Respondes cada pregunta con datos concretos, sin rodeos
- Usas search_product para mostrar productos cuando aplique
- Sos empatica y tranquila, nunca apurada ni agresiva
- Sabes bien lo que vendes y respondes con seguridad
- Das tu opinion honesta cuando el cliente esta indeciso

Lo que NO haces:
- No das discursos largos sobre el producto
- No repetis info que ya diste
- No presionas
- No mandas todo el catalogo de una — pregunta que necesita primero
- No tarjetas personalizadas actualmente (por volumen de pedidos)


# FORMATO DE PEDIDO

Cuando tengas todos los datos, arma resumen asi:

*Pedido*
Producto: [nombre del producto]
Joya: [joya elegida]
Personalizacion: [si aplica]

Datos del destinatario:
Nombre: [nombre]
Telefono: [telefono]

Entrega:
Tipo: [Delivery/Retiro local/Agencia/Domicilio interior]
Ciudad: [ciudad]
Direccion: [direccion si aplica]
Fecha de entrega: [fecha]

Pago:
Metodo: [transferencia/efectivo/giro]
Total: [monto] Gs

Despues del resumen, derivar a humano con request_human_handoff.


# ESCALACION A AGENTE HUMANO

Derivar INMEDIATAMENTE si:
- El cliente envia comprobante de pago
- El cliente envia foto de la mano para talle de anillo
- El cliente pide hablar con asesor
- El pedido esta listo para confirmar pago
- El cliente necesita algo que no podes resolver
- El cliente sigue frustrado despues de 2 intentos

Cuando activas handoff: "Dale, ya te paso con alguien del equipo. Te van a escribir en un ratito" y deja de responder.


# PROCESAMIENTO DE MEDIOS

Imagen: analizala y responde al contenido. Si es una joya que vio en otro lado, decile cual de tus productos se parece mas. Si es un comprobante de pago, deriva a humano inmediatamente.
Audio: responde al contenido como si fuera texto.
Ubicacion: usa calculate_delivery si aplica.


# CLIENTES DIFICILES

Frustrado: "Mira, tenes razon. Dejame ver que puedo hacer"
Insulta (primer intento): "Quiero ayudarte, pero necesito que hablemos con respeto"
Insulta (segundo intento): "Entiendo que estas molesto. Te paso con alguien del equipo" y activa handoff.
Repite la misma pregunta: responde de nuevo con otras palabras. Si sigue: "Hay algo especifico que no te quedo claro?"
Desaparece y vuelve: "Hola! Seguimos con tu pedido?"


# REGLAS FINALES — MAXIMA PRIORIDAD

1. Maximo 3-4 lineas por mensaje. Si necesitas mas, manda dos mensajes separados.
2. Una sola pregunta por respuesta. Nunca dos preguntas en el mismo mensaje.
3. Usa formato WhatsApp: *negrita* y _cursiva_. No uses ## ni backticks ni listas numeradas ni vinetas.
4. Emojis maximo 1 por mensaje, no en todos.
5. Te presentas UNA SOLA VEZ por conversacion.
6. Si no sabes algo: "Dejame verificar y te confirmo"
7. Si el cliente da datos en un mensaje, registrar todos y no volver a preguntar lo que ya dio.
8. Nunca asumir ni inferir datos que el cliente no dijo.
9. Cada mensaje debe tener un proposito: responder, informar o avanzar la venta.
10. No repitas confirmaciones innecesarias.
11. Despues de activar handoff, no seguir respondiendo.
12. Tu primer mensaje a un lead nuevo: saluda, reconoce brevemente lo que el cliente dijo o pregunto, y pregunta su nombre.
13. Si ya mostraste un producto, no vuelvas a buscarlo. Solo usa search_product para un producto NUEVO.
14. Avanza rapido hacia el cierre sin friccion. En temporada alta se aun mas directa.
15. NUNCA escribas URLs en tu texto. La interfaz muestra la foto automaticamente.`,
    products: [
      { name: 'Rosa Iluminada con Collar Giratorio', price: 225000, category: 'Rosa con Collar', stock: 50, description: 'Rosa preservada en caja con luces LED + collar de latón enchapado en oro 18k. Opciones de joya: Flor Giratoria (fucsia/transparente/rosado), Girasol Serena, Girasol Giratorio' },
      { name: 'Rosa Iluminada con Collar Encantador', price: 225000, category: 'Rosa con Collar', stock: 50, description: 'Rosa preservada en caja con luces LED + collar de latón enchapado en oro 18k. Opciones: Set Sunshine Giratorio (+75.000), Tulipán Colgante, Tulipán, Abrazo' },
      { name: 'Rosa Iluminada con Set Cadena y Aros', price: 235000, category: 'Rosa con Set', stock: 50, description: 'Rosa preservada en caja con luces LED + collar y aros de acero enchapado en oro 18k. Sets: Redondos, Corazones o Princess Cut, en dorado o plata' },
      { name: 'Rosa Iluminada con Collar Entrelazados', price: 235000, category: 'Rosa con Collar Personalizable', stock: 50, description: 'Rosa preservada en caja con luces LED + collar entrelazado personalizable de acero enchapado. Dorado, plata u oro rosado. Se graba nombre.' },
      { name: 'Rosa Iluminada con Collar Personalizado', price: 255000, category: 'Rosa con Collar Personalizable', stock: 50, description: 'Rosa preservada en caja con luces LED + collar de acero enchapado en oro 18k personalizable. Opciones: Duo, Pulsera Rez, Love, Circle. Grabado incluido.' },
      { name: 'Rosa Iluminada con Joya de Plata 925', price: 335000, category: 'Rosa con Plata 925', stock: 30, description: 'Rosa preservada en caja con luces LED + joya de plata 925 legítima. Opciones: Collar Unión Eterna, Corazoncito (transparente/rosado), Luz, y más' },
      { name: 'Rosa Iluminada con Diamante Moissanita', price: 390000, category: 'Rosa con Moissanita', stock: 20, description: 'Rosa preservada en caja con luces LED + joya de plata 925 con diamante moissanita. Anillos: Impegno, Maestro, Solite. Collar: Cori. Timeless (+140.000). Certificado GRA incluido.' },
    ],
    features: { multiChannel: true, inventory: true, crm: true, orders: true, appointments: false, delivery: true },
    agentConfig: {
      storeHours: {
        monday:    { active: true,  open: '09:00', close: '19:00' },
        tuesday:   { active: true,  open: '09:00', close: '19:00' },
        wednesday: { active: true,  open: '09:00', close: '19:00' },
        thursday:  { active: true,  open: '09:00', close: '19:00' },
        friday:    { active: true,  open: '09:00', close: '19:00' },
        saturday:  { active: true,  open: '09:00', close: '19:00' },
        sunday:    { active: true,  open: '10:00', close: '18:00' },
      },
      deliveryZones: [
        { zone_name: 'Asunción', price: 25000 },
        { zone_name: 'Lambaré', price: 25000 },
        { zone_name: 'Villa Elisa', price: 25000 },
        { zone_name: 'Ñemby', price: 25000 },
        { zone_name: 'San Antonio', price: 25000 },
        { zone_name: 'San Lorenzo', price: 25000 },
        { zone_name: 'Fernando de la Mora', price: 25000 },
        { zone_name: 'Mariano Roque Alonso', price: 25000 },
        { zone_name: 'Luque', price: 25000 },
        { zone_name: 'Capiatá', price: 25000 },
      ],
      faq: [
        { question: '¿Las rosas son naturales?', answer: 'Sí, son rosas 100% naturales preservadas. Duran años sin agua ni sol.' },
        { question: '¿Se puede personalizar?', answer: 'Sí, las joyas Entrelazados, Duo, Pulsera Rez, Love y Circle se pueden grabar con nombre o frase (+20.000 Gs).' },
        { question: '¿Hacen envíos al interior?', answer: 'Sí, a todo el país. Retiro en agencia 25.000 Gs, envío a domicilio interior 35.000 Gs.' },
        { question: '¿Puedo pagar al recibir?', answer: 'Solo en Asunción y ciudades de Central (Lambaré, San Lorenzo, Luque, etc.). Interior: pago adelantado.' },
        { question: '¿Dónde queda el local?', answer: 'Recoleta, Asunción. Lunes a Sábado 09:00-19:00, Domingo 10:00-18:00.' },
        { question: '¿La joya viene con la rosa?', answer: 'Sí, todos nuestros productos incluyen rosa preservada + caja con luces LED + joya a elección.' },
      ],
      specialInstructions: [
        { instruction: 'Todos los productos son combos: rosa + caja LED + joya. No se venden por separado.', active: true },
        { instruction: 'Pago en efectivo al recibir SOLO en: Asunción, Lambaré, Villa Elisa, Ñemby, San Antonio, San Lorenzo, Fernando de la Mora, MRA, Luque, Capiatá. Fuera de ahí: pago adelantado.', active: true },
        { instruction: 'Si es regalo: pago completo por adelantado siempre. Si tiene grabado: mínimo seña anticipada.', active: true },
        { instruction: 'NO ofrecer tarjeta en delivery. NO mencionar POS.', active: true },
        { instruction: 'No hacemos tarjetas personalizadas actualmente por volumen de pedidos.', active: true },
        { instruction: 'Derivar a humano cuando el pedido esté completo para confirmar pago, cuando envíen comprobante, o cuando pidan hablar con alguien.', active: true },
      ],
    },
  },
};

const EMPTY_PRODUCT = { name: '', price: '', category: '', stock: '', description: '' };

const FEATURE_LABELS = {
  multiChannel: { label: 'Canales (IG/WA/FB)', icon: 'fas fa-comments' },
  inventory: { label: 'Inventario', icon: 'fas fa-boxes' },
  crm: { label: 'CRM', icon: 'fas fa-users' },
  orders: { label: 'Pedidos', icon: 'fas fa-shopping-bag' },
  appointments: { label: 'Citas', icon: 'fas fa-calendar-alt' },
  delivery: { label: 'Delivery', icon: 'fas fa-truck' },
};

const INPUT_CLASS = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition outline-none';

export default function SetupPage() {
  const { setConfig, setStats } = useAppContext();

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentRole, setAgentRole] = useState('Asesora de ventas');
  const [logoUrl, setLogoUrl] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [ownerNameField, setOwnerNameField] = useState('');
  const [ownerEmailField, setOwnerEmailField] = useState('');
  const [products, setProducts] = useState([{ ...EMPTY_PRODUCT }, { ...EMPTY_PRODUCT }, { ...EMPTY_PRODUCT }]);
  const [features, setFeatures] = useState({
    multiChannel: true, inventory: true, crm: true, orders: true, appointments: false, delivery: false,
  });
  // agentConfig (storeHours / deliveryZones / faq / specialInstructions) — set by templates
  const [agentConfig, setAgentConfig] = useState({
    storeHours: STORE_HOURS_STANDARD,
    deliveryZones: DEFAULT_DELIVERY_ZONES,
    faq: [],
    specialInstructions: [],
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const templateDropdownRef = useRef(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Load current status
  useEffect(() => {
    fetch(`${API_URL}/api/demo/setup/status`)
      .then(r => r.json())
      .then(data => { if (data.success) setStatus(data.data); })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  // Close template dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target)) {
        setTemplateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Apply template
  const applyTemplate = (key) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setBusinessName(t.businessName);
    setAgentName(t.agentName);
    setAgentRole(t.agentRole);
    setSystemPrompt(t.systemPrompt);
    setProducts(t.products.map(p => ({ ...p, price: String(p.price), stock: String(p.stock) })));
    setFeatures({ ...t.features });
    setAgentConfig(t.agentConfig || {
      storeHours: STORE_HOURS_STANDARD,
      deliveryZones: DEFAULT_DELIVERY_ZONES,
      faq: [],
      specialInstructions: [],
    });
    setOwnerNameField(t.ownerName || t.businessName);
    setOwnerEmailField(t.ownerEmail || '');
    setLogoUrl(t.logoUrl || '');
  };

  // Product table helpers
  const updateProduct = (idx, field, value) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const addProduct = () => setProducts(prev => [...prev, { ...EMPTY_PRODUCT }]);
  const removeProduct = (idx) => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleFeature = (key) => setFeatures(prev => ({ ...prev, [key]: !prev[key] }));

  // Validate
  const validProducts = products.filter(p => p.name.trim() && p.price);
  const isValid = businessName.trim() && agentName.trim() && systemPrompt.trim() && validProducts.length >= 1;

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setToast(null);

    try {
      const body = {
        businessName: businessName.trim(),
        agentName: agentName.trim(),
        agentRole: agentRole.trim() || 'Asesora de ventas',
        logoUrl: logoUrl.trim(),
        ownerName: ownerNameField.trim() || businessName.trim(),
        ownerEmail: ownerEmailField.trim() || 'demo@oneai.com',
        systemPrompt: systemPrompt.trim(),
        products: validProducts.map(p => ({
          name: p.name.trim(),
          price: Number(p.price),
          currency: 'Gs',
          category: p.category.trim() || 'General',
          description: p.description.trim(),
          stock: Number(p.stock) || 10,
          image_url: p.image_url || '',
        })),
        features,
        agentConfig,
      };

      const res = await fetch(`${API_URL}/api/demo/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setToast({ type: 'success', message: data.message });
        // Refresh status
        const statusRes = await fetch(`${API_URL}/api/demo/setup/status`).then(r => r.json());
        if (statusRes.success) setStatus(statusRes.data);
        // Refresh global config + stats
        const [configRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/config`).then(r => r.json()),
          fetch(`${API_URL}/api/demo/stats`).then(r => r.json()),
        ]);
        if (configRes.success) setConfig(configRes.data);
        setStats(statsRes);
      } else {
        setToast({ type: 'error', message: data.error || 'Error desconocido' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 max-w-md px-5 py-4 rounded-xl shadow-lg border flex items-start gap-3 animate-in ${
          toast.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'} text-lg mt-0.5`}></i>
          <div className="flex-1">
            <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xs"></i></button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            <i className="fas fa-cog text-indigo-500 mr-2"></i>Configurar Demo
          </h1>
          <p className="text-gray-500">Prepará el dashboard para tu próxima reunión</p>
        </div>

        {/* Template selector */}
        <div className="relative" ref={templateDropdownRef}>
          <button type="button" onClick={() => setTemplateDropdownOpen(o => !o)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2 shadow-sm">
            <i className="fas fa-magic text-indigo-500"></i>
            Templates rápidos
            <i className={`fas fa-chevron-${templateDropdownOpen ? 'up' : 'down'} text-gray-400 text-xs ml-1`}></i>
          </button>
          {templateDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-40">
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { applyTemplate(key); setTemplateDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <i className={`${t.icon} text-indigo-500 text-sm`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-400">{t.businessName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">

        {/* ── DATOS DEL NEGOCIO ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-store text-indigo-500"></i>Datos del negocio
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio <span className="text-red-400">*</span></label>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                placeholder="Silver Line Joyería" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del agente <span className="text-red-400">*</span></label>
              <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                placeholder="Jessica" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol del agente</label>
              <input type="text" value={agentRole} onChange={e => setAgentRole(e.target.value)}
                placeholder="Asesora de ventas" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL <span className="text-gray-400 text-xs">(opcional)</span></label>
              <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..." className={INPUT_CLASS} />
            </div>
          </div>
        </div>

        {/* ── PROMPT ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-robot text-purple-500"></i>Prompt del agente <span className="text-red-400">*</span>
          </h3>
          <textarea
            value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
            rows={10}
            placeholder="Sos Jessica, asesora de ventas de Silver Line Joyería en Paraguay. Hablás en español paraguayo, con tono amigable y profesional..."
            className={`${INPUT_CLASS} font-mono text-sm leading-relaxed`}
          />
          <p className="mt-2 text-xs text-gray-400">
            <i className="fas fa-lightbulb text-amber-400 mr-1"></i>
            Describí la personalidad y conocimiento del agente. Incluí info sobre productos, políticas del negocio, y cómo debe responder.
          </p>
        </div>

        {/* ── PRODUCTOS ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-boxes text-blue-500"></i>Productos
              <span className="text-xs text-gray-400 font-normal ml-1">(mínimo 1 con nombre y precio)</span>
            </h3>
            <button type="button" onClick={addProduct}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5">
              <i className="fas fa-plus text-xs"></i>Agregar
            </button>
          </div>

          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-1 mb-2">
            <span className="col-span-3 text-xs font-semibold text-gray-500 uppercase">Nombre</span>
            <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Precio (Gs)</span>
            <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Categoría</span>
            <span className="col-span-1 text-xs font-semibold text-gray-500 uppercase">Stock</span>
            <span className="col-span-3 text-xs font-semibold text-gray-500 uppercase">Descripción</span>
            <span className="col-span-1"></span>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {products.map((p, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50/50 rounded-lg p-2 md:p-1">
                <input type="text" value={p.name} onChange={e => updateProduct(idx, 'name', e.target.value)}
                  placeholder="Nombre producto" className={`${INPUT_CLASS} col-span-1 md:col-span-3`} />
                <input type="number" value={p.price} onChange={e => updateProduct(idx, 'price', e.target.value)}
                  placeholder="150000" min="0" className={`${INPUT_CLASS} col-span-1 md:col-span-2`} />
                <input type="text" value={p.category} onChange={e => updateProduct(idx, 'category', e.target.value)}
                  placeholder="Categoría" className={`${INPUT_CLASS} col-span-1 md:col-span-2`} />
                <input type="number" value={p.stock} onChange={e => updateProduct(idx, 'stock', e.target.value)}
                  placeholder="10" min="0" className={`${INPUT_CLASS} col-span-1 md:col-span-1`} />
                <input type="text" value={p.description} onChange={e => updateProduct(idx, 'description', e.target.value)}
                  placeholder="Descripción breve" className={`${INPUT_CLASS} col-span-1 md:col-span-3`} />
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => removeProduct(idx)}
                    disabled={products.length <= 1}
                    className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-400">
            {validProducts.length} producto{validProducts.length !== 1 ? 's' : ''} válido{validProducts.length !== 1 ? 's' : ''}
            {validProducts.length < 1 && <span className="text-red-400 ml-1">— necesitás al menos 1</span>}
          </p>
        </div>

        {/* ── FEATURES ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-toggle-on text-green-500"></i>Features visibles en sidebar
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(FEATURE_LABELS).map(([key, { label, icon }]) => {
              const enabled = features[key];
              return (
                <button key={key} type="button" onClick={() => toggleFeature(key)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition flex items-center gap-2.5 ${
                    enabled ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                  }`}>
                  <i className={`${icon} ${enabled ? 'text-indigo-500' : 'text-gray-300'}`}></i>
                  <span>{label}</span>
                  <i className={`fas ${enabled ? 'fa-check-circle text-indigo-500' : 'fa-circle text-gray-200'} ml-auto`}></i>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SUBMIT ── */}
        <button type="submit" disabled={loading || !isValid}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Configurando demo...
            </>
          ) : (
            <>
              <i className="fas fa-rocket"></i>
              Preparar Demo
            </>
          )}
        </button>

        {/* ── STATUS ── */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200/60">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle text-gray-400"></i>Estado actual
          </h3>
          {statusLoading ? (
            <div className="animate-pulse flex gap-4">
              <div className="h-5 bg-gray-200 rounded w-40"></div>
              <div className="h-5 bg-gray-200 rounded w-32"></div>
            </div>
          ) : status ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Negocio</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{status.businessName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Agente</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{status.agentName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Productos / Contactos</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{status.productCount} productos · {status.contactCount} contactos</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Última configuración</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {status.lastSetup
                    ? new Date(status.lastSetup).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(status.lastSetup).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
                    : 'Nunca configurado'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No se pudo cargar el estado</p>
          )}
        </div>
      </form>
    </div>
  );
}
