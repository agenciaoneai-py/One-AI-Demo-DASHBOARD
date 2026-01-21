// Configuración del cliente actual
// Cambiar estos valores según el cliente del demo

const CLIENT_CONFIG = {
  // Información del negocio
  businessName: "Demo Business", // Cambiar por: "Joyería La Perla"
  industry: "demo", // Opciones: 'jewelry', 'trading', 'ecommerce', 'real-estate'
  
  // Branding
  logoUrl: "https://ui-avatars.com/api/?name=Demo+Business&background=6366f1&color=fff",
  primaryColor: "#6366f1", // Indigo
  secondaryColor: "#8b5cf6", // Purple
  
  // Contacto
  ownerName: "Demo Owner",
  country: "Paraguay",
  
  // Features habilitadas
  features: {
    inventory: true,
    analytics: true,
    crm: true,
    multiChannel: true
  }
};

// Configuraciones específicas por industria
const INDUSTRY_CONFIG = {
  jewelry: {
    productCategories: ['Anillos', 'Collares', 'Aretes', 'Pulseras', 'Relojes'],
    metadataFields: ['material', 'weight_grams', 'stone_type', 'stone_carats', 'size_mm'],
    agentRole: 'Asesor de joyería',
    agentGoal: 'Ayudar a clientes a encontrar la joya perfecta'
  },
  trading: {
    productCategories: ['Cursos', 'Mentoría', 'Señales', 'Libros'],
    metadataFields: ['duration', 'level', 'language'],
    agentRole: 'Asesor de trading',
    agentGoal: 'Calificar leads y agendar llamadas'
  },
  ecommerce: {
    productCategories: ['Electrónica', 'Ropa', 'Hogar', 'Deportes'],
    metadataFields: ['brand', 'warranty', 'shipping_time'],
    agentRole: 'Asistente de ventas',
    agentGoal: 'Ayudar con consultas de productos'
  }
};

function getClientConfig() {
  return CLIENT_CONFIG;
}

function getIndustryConfig() {
  return INDUSTRY_CONFIG[CLIENT_CONFIG.industry] || INDUSTRY_CONFIG.ecommerce;
}

export {
  CLIENT_CONFIG,
  INDUSTRY_CONFIG,
  getClientConfig,
  getIndustryConfig
};