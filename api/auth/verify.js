import { supabase } from '../supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    let { phone, code, fullName } = req.body;
    if (code !== '123456') return res.status(400).json({ error: "Mã OTP sai" });

    try {
        const { data: rows, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone);
            
        if (error) throw error;
        
        let user = rows[0];

        if (!user) {
            if (!fullName) return res.json({ requireProfile: true });

            let newId = 'USR_' + Math.random().toString(36).substring(2, 12).toUpperCase();
            let role = phone.includes('admin') ? 'admin' : 'user';

            const { error: insertError } = await supabase
                .from('users')
                .insert([{ id: newId, phone, fullName, role }]);
                
            if (insertError) throw insertError;
            user = { id: newId, phone, fullName, role };
        }

        res.json({ success: true, user });
    } catch (e) {
        console.error("Auth Error:", e);
        res.status(500).json({ error: "Lỗi kết nối Supabase Server" });
    }
}
