import { supabase } from './supabase.js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
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

        // 1. Upload ảnh lên Supabase Storage (Bucket tên là 'selfies')
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('selfies')
            .upload(filename, imageBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 2. Lấy Public URL của ảnh vừa upload
        const { data: { publicUrl } } = supabase.storage
            .from('selfies')
            .getPublicUrl(filename);

        const selfieUrl = publicUrl;

        // 3. Upsert vào bảng attendances
        const { error: dbError } = await supabase
            .from('attendances')
            .upsert({
                userId,
                eventId,
                userName,
                phone,
                selfieUrl,
                timestamp: new Date().toISOString()
            }, { onConflict: 'userId, eventId' });

        if (dbError) throw dbError;

        res.json({ success: true, selfieUrl });
    } catch (e) {
        console.error("Supabase Checkin Error:", e);
        res.status(500).json({ error: "Lỗi lưu điểm danh lên Supabase", details: e.message });
    }
}
