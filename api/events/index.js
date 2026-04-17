import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { name, lat, lng, radius } = req.body;
        const id = 'EVT_' + Math.random().toString(36).substring(2, 12).toUpperCase();
        
        try {
            await sql`INSERT INTO events (id, name, lat, lng, radius) VALUES (${id}, ${name}, ${lat}, ${lng}, ${radius})`;
            res.json({ id, name });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Lỗi tạo sự kiện" });
        }
    } 
    else if (req.method === 'GET') {
        try {
            const { rows } = await sql`SELECT * FROM events ORDER BY createdAt DESC`;
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
