import { supabase } from '../supabase.js';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { name } = req.body;
        const id = 'CLS_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        
        try {
            const { error } = await supabase
                .from('classes')
                .insert([{ id, name }]);
                
            if (error) throw error;
            res.json({ id, name });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Lỗi tạo Lớp Học" });
        }
    } 
    else if (req.method === 'GET') {
        try {
            const { data: rows, error } = await supabase
                .from('classes')
                .select('*')
                .order('createdAt', { ascending: true });
                
            if (error) throw error;
            res.json(rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Lỗi kéo danh sách Lớp học" });
        }
    } 
    else {
        res.status(405).json({ error: "Method Not Allowed" });
    }
}
