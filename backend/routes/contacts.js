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

    const all = contacts || [];
    const scores = all.map(c => c.engagement_score || 0).filter(s => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const stats = {
      total: all.length,
      new: all.filter(c => c.status === 'new').length,
      qualified: all.filter(c => c.status === 'qualified').length,
      converted: all.filter(c => c.status === 'converted').length,
      hot_leads: all.filter(c => c.lead_quality === 'hot').length,
      total_revenue: all.reduce((sum, c) => sum + (parseFloat(c.lifetime_value) || 0), 0),
      avgScore,
      byTemperature: {
        hot: all.filter(c => c.lead_quality === 'hot').length,
        warm: all.filter(c => c.lead_quality === 'warm').length,
        cold: all.filter(c => c.lead_quality === 'cold').length,
        closed: all.filter(c => c.status === 'converted').length,
      },
      byPlatform: {
        instagram: all.filter(c => c.platform === 'instagram').length,
        whatsapp: all.filter(c => c.platform === 'whatsapp').length,
        facebook: all.filter(c => c.platform === 'facebook').length,
      },
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