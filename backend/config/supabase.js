import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
}

// Cliente con service_role para el backend (acceso completo)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default supabase;