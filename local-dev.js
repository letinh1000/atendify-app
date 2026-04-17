import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Import các API serverless
import authSendOtp from './api/auth/send-otp.js';
import authVerify from './api/auth/verify.js';
import authAdminLogin from './api/auth/admin-login.js';
import classesIndex from './api/classes/index.js';
import eventsIndex from './api/events/index.js';
import eventsId from './api/events/[id].js';
import eventsLive from './api/events/live.js';
import checkin from './api/checkin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Hỗ trợ JSON base64 lớn
app.use(express.static(__dirname)); // Phục vụ file tĩnh (HTML, CSS, JS)

// Giả lập Vercel Routing
app.post('/api/auth/send-otp', authSendOtp);
app.post('/api/auth/verify', authVerify);
app.post('/api/auth/admin-login', authAdminLogin);
app.all('/api/classes', classesIndex);
app.all('/api/events', eventsIndex);
app.get('/api/events/live', eventsLive);
app.get('/api/events/:id', (req, res) => {
    // Ép params vào req.query để mô phỏng Vercel [id].js
    req.query.id = req.params.id;
    return eventsId(req, res);
});
app.post('/api/checkin', checkin);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🟢 MÔ PHỎNG VERCEL SERVERLESS ĐANG CHẠY TẠI: http://localhost:${PORT}`);
    console.log(`Lưu ý: Bạn phải có file .env chức SUPABASE_URL và SUPABASE_ANON_KEY thì các chức năng backend mới hoạt động!\n`);
});
