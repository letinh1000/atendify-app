import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn("Lưu ý: Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong biến môi trường.");
    }
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key');
