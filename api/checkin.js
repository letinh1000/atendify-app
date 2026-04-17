import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Cho phép payload JSON lớn (để chứa base64)
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { eventId, userId, userName, phone, selfieBase64 } = req.body;

        if (!selfieBase64) return res.status(400).json({ error: "Thiếu ảnh Selfie" });

        // Parse base64
        const base64Data = selfieBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filename = `${userId}-${eventId}-${Date.now()}.jpg`;

        // Đẩy lên Vercel Blob
        const blob = await put(filename, imageBuffer, {
            access: 'public',
            contentType: 'image/jpeg'
        });

        const selfieUrl = blob.url;

        // Lưu vào Postgres
        await sql`
            INSERT INTO attendances (userId, eventId, userName, phone, selfieUrl, timestamp)
            VALUES (${userId}, ${eventId}, ${userName}, ${phone}, ${selfieUrl}, CURRENT_TIMESTAMP)
            ON CONFLICT (userId, eventId) 
            DO UPDATE SET selfieUrl = EXCLUDED.selfieUrl, timestamp = CURRENT_TIMESTAMP
        `;

        res.json({ success: true, selfieUrl });
    } catch (e) {
        console.error("Checkin Error:", e);
        res.status(500).json({ error: "Lỗi lưu điểm danh", details: e.message });
    }
}
