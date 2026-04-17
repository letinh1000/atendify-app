import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    const { id, lastTimestamp } = req.query;

    if (req.method === 'GET') {
        try {
            // Lấy tất cả hoặc lấy những cái diễn ra sau lastTimestamp
            let query;
            if (lastTimestamp) {
                query = sql`SELECT * FROM attendances WHERE eventId = ${id} AND timestamp > ${lastTimestamp} ORDER BY timestamp DESC`;
            } else {
                query = sql`SELECT * FROM attendances WHERE eventId = ${id} ORDER BY timestamp DESC`;
            }
            
            const { rows } = await query;
            res.json(rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Lỗi kết nối Polling Live DB" });
        }
    } else {
        res.status(405).json({ error: "Method Not Allowed" });
    }
}
