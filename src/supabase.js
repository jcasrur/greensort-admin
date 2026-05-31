import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yaqpvcriphvcqdmpsfxa.supabase.co';
const supabaseKey = 'sb_publishable_di2DEocf3L8DH9XUyy9CPg_r4uU0xQj';


export const supabase = createClient(supabaseUrl, supabaseKey);