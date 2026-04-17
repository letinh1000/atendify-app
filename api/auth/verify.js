import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    let { phone, code, fullName } = req.body;
    if (code !== '123456') return res.status(400).json({ error: "Mã OTP sai" });

    try {
        const { rows } = await sql`SELECT * FROM users WHERE phone = ${phone}`;
        let user = rows[0];

        if (!user) {
            if (!fullName) return res.json({ requireProfile: true });

            let newId = 'USR_' + Math.random().toString(36).substring(2, 12).toUpperCase();
            let role = phone.includes('admin') ? 'admin' : 'user';

            await sql`INSERT INTO users (id, phone, fullName, role) VALUES (${newId}, ${phone}, ${fullName}, ${role})`;
            user = { id: newId, phone, fullName, role };
        }

        res.json({ success: true, user });
    } catch (e) {
        console.error("Auth Error:", e);
        res.status(500).json({ error: "Lỗi kết nối Server" });
    }
}
