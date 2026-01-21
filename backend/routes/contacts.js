import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// GET /api/contacts - Obtener todos los contactos con filtros
router.get('/', async (req, res) => {
  try {
    const { platform, status, lead_quality, search } = req.query;
    
    let query = supabase
      .from('contacts')
      .select(`
        *,
        tags:contact_tags(tag, auto_generated)
      `)
      .order('last_interaction_at', { ascending: false });

    // Aplicar filtros
    if (platform) query = query.eq('platform', platform);
    if (status) query = query.eq('status', status);
    if (lead_quality) query = query.eq('lead_quality', lead_quality);
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error obteniendo contactos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/contacts/stats - Estadísticas del CRM
router.get('/stats', async (req, res) => {
  try {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('status, lead_quality, lifetime_value');

    const stats = {
      total: contacts?.length || 0,
      new: contacts?.filter(c => c.status === 'new').length || 0,
      qualified: contacts?.filter(c => c.status === 'qualified').length || 0,
      converted: contacts?.filter(c => c.status === 'converted').length || 0,
      hot_leads: contacts?.filter(c => c.lead_quality === 'hot').length || 0,
      total_revenue: contacts?.reduce((sum, c) => sum + (parseFloat(c.lifetime_value) || 0), 0) || 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo stats CRM:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;