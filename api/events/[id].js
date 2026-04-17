import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    const { id } = req.query;

    if (req.method === 'GET') {
        try {
            const { rows } = await sql`SELECT * FROM events WHERE id = ${id}`;
            const event = rows[0];
            
            if (!event) return res.status(404).json({ error: "Sự kiện bị rỗng" });
            
            event.location = { lat: event.lat, lng: event.lng };
            res.json(event);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Lỗi tham vấn db" });
        }
    } else {
        res.status(405).json({ error: "Method Not Allowed" });
    }
}
