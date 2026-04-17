export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Thiếu số điện thoại" });
    
    // Giữ nguyên logic trả về mã ảo nội bộ
    res.json({ success: true, message: "Mã OTP để kiểm tra là 123456" });
}
