import { supabase } from '../supabase.js';

export default async function handler(req, res) {
    const { id, lastTimestamp } = req.query;

    if (req.method === 'GET') {
        try {
            let query = supabase
                .from('attendances')
                .select('*')
                .eq('eventId', id)
                .order('timestamp', { ascending: false });

            // Supabase filter greater than (gt)
            if (lastTimestamp) {
                query = query.gt('timestamp', lastTimestamp);
            }
            
            const { data: rows, error } = await query;
            if (error) throw error;
            
            res.json(rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Lỗi kết nối Polling Supabase Live DB" });
        }
    } else {
        res.status(405).json({ error: "Method Not Allowed" });
    }
}
