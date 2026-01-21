import express from 'express';
import { getClientConfig, getIndustryConfig } from '../config/client-config.js';

const router = express.Router();

// GET /api/config - Obtener configuración del cliente
router.get('/', (req, res) => {
  try {
    const clientConfig = getClientConfig();
    const industryConfig = getIndustryConfig();

    res.json({
      success: true,
      data: {
        ...clientConfig,
        industryConfig
      }
    });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración'
    });
  }
});

export default router;
