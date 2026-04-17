import { supabase } from '../supabase.js';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { name, lat, lng, radius } = req.body;
        const id = 'EVT_' + Math.random().toString(36).substring(2, 12).toUpperCase();
        
        try {
            const { error } = await supabase
                .from('events')
                .insert([{ id, name, lat, lng, radius }]);
                
            if (error) throw error;
            res.json({ id, name });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Lỗi tạo sự kiện" });
        }
    } 
    else if (req.method === 'GET') {
        try {
            const { data: rows, error } = await supabase
                .from('events')
                .select('*')
                .order('createdAt', { ascending: false });
                
            if (error) throw error;
            res.json(rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Lỗi lấy sự kiện" });
        }
    } 
    else {
        res.status(405).json({ error: "Method Not Allowed" });
    }
}
