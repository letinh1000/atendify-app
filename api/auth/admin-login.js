export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    const { password } = req.body;
    const realPassword = process.env.ADMIN_PASSWORD || 'atendify2026';

    if (password === realPassword) {
        // Trả về một token giả hoặc thông tin đại diện Admin
        return res.json({ 
            success: true, 
            adminToken: 'ADM_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
            role: 'master_admin'
        });
    } else {
        return res.status(401).json({ error: "Mật khẩu quản trị không đúng!" });
    }
}
