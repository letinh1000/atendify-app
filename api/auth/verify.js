import { supabase } from '../supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    let { phone, code, fullName, email, classId, className } = req.body;
    // OTP học sinh bypass mặc định là 123456
    if (code !== '123456') return res.status(400).json({ error: "Mã OTP sai" });

    try {
        const { data: rows, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone);
            
        if (error) throw error;
        
        let user = rows[0];

        if (!user) {
            if (!fullName || !email || !classId) return res.json({ requireProfile: true });

            let newId = 'USR_' + Math.random().toString(36).substring(2, 12).toUpperCase();
            let role = 'user'; // Đảm bảo mọi người đăng nhập từ màn hình sinh viên chỉ là user

            const { error: insertError } = await supabase
                .from('users')
                .insert([{ id: newId, phone, fullName, email, classId, className, role }]);
                
            if (insertError) throw insertError;
            user = { id: newId, phone, fullName, email, classId, className, role };
        }

        res.json({ success: true, user });
    } catch (e) {
        console.error("Auth Error:", e);
        res.status(500).json({ error: "Lỗi kết nối Supabase Server" });
    }
}
