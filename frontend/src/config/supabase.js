import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jamfojylflunevilrwel.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphbWZvanlsZmx1bmV2aWxyd2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE0NzIsImV4cCI6MjA3OTM5NzQ3Mn0.1VX3nE39ad-1_iYZPOV7Nitp_ZMGBOWplP0xK5H9VNQ'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;