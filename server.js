import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Setup thư mục lưu ảnh Uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Cấu hình Multer để phân tích Binary ảnh nhận được
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir) },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg')
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Database Setup
const db = new Database('database.db');
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone TEXT,
        fullName TEXT,
        role TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT,
        lat REAL,
        lng REAL,
        radius INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendances (
        userId TEXT,
        eventId TEXT,
        userName TEXT,
        phone TEXT,
        selfieUrl TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, eventId)
    );
`);

// SSE (Server-Sent Events) Clients
let clients = [];

// Hàm random ID siêu nhẹ
const generateId = () => Math.random().toString(36).substring(2, 12).toUpperCase();

// --- API ROUTES ---

// 1. Auth: Đăng ký số nhận mã OTP nội bộ (Code mặc định sẽ luôn gửi về kết quả THÀNH CÔNG và yêu cầu user gõ 123456)
app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Thiếu số điện thoại" });
    res.json({ success: true, message: "Mã OTP để kiểm tra là 123456" });
});

// 2. Auth: Trả về trạng thái đăng nhập
app.post('/api/auth/verify', (req, res) => {
    let { phone, code, fullName } = req.body;
    if (code !== '123456') return res.status(400).json({ error: "Mã OTP sai" });
    
    // Tìm db
    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
        // User mơí, bắt cầu fullName
        if (!fullName) return res.json({ requireProfile: true });
        
        let newId = 'USR_' + generateId();
        let role = phone.includes('admin') ? 'admin' : 'user'; // Mẹo: Nếu nhập SDT có chữ admin thì hệ thống cấp ngay quyền
        
        db.prepare('INSERT INTO users (id, phone, fullName, role) VALUES (?, ?, ?, ?)').run(newId, phone, fullName, role);
        user = { id: newId, phone, fullName, role };
    }
    
    res.json({ success: true, user });
});

// 3. API Quản lý Sự kiện
app.post('/api/events', (req, res) => {
    const { name, lat, lng, radius } = req.body;
    const id = 'EVT_' + generateId();
    db.prepare('INSERT INTO events (id, name, lat, lng, radius) VALUES (?, ?, ?, ?, ?)').run(id, name, lat, lng, radius);
    res.json({ id, name });
});

app.get('/api/events', (req, res) => {
    const events = db.prepare('SELECT * FROM events ORDER BY createdAt DESC').all();
    res.json(events);
});

app.get('/api/events/:id', (req, res) => {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: "Sự kiện bị rỗng" });
    
    event.location = { lat: event.lat, lng: event.lng }; // Chuẩn hóa json trả về cho khớp app cũ
    res.json(event);
});

// 4. API Chụp Ảnh Checklist (sử dụng Multer lưu ảnh về /uploads)
app.post('/api/checkin', upload.single('selfie'), (req, res) => {
    try {
        const { eventId, userId, userName, phone } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "Có lỗi khi chuyển file nhị phân ảnh!" });

        const selfieUrl = `http://127.0.0.1:${PORT}/uploads/${file.filename}`;
        
        // Ghi nhận
        db.prepare('INSERT OR REPLACE INTO attendances (userId, eventId, userName, phone, selfieUrl, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
          .run(userId, eventId, userName, phone, selfieUrl, new Date().toISOString());

        // Gửi Broadcast Socket thông minh xuống các Admin (Real realtime sync)
        const checkinData = { userId, eventId, userName, phone, selfieUrl, timestamp: new Date().toISOString() };
        clients.forEach(client => {
            if (client.eventId === eventId) {
                // Đẩy dòng text đi
                client.res.write(`data: ${JSON.stringify([checkinData])}\n\n`);
            }
        });

        res.json({ success: true, selfieUrl });
    } catch (e) {
        console.error("Selfie Err", e);
        res.status(500).json({ error: "Lỗi kết nối điểm danh" });
    }
});

// 5. Mở Cổng Server-Sent Events (SSE) để kết nối Real-time cho UI Web thay Firebase onSnapshot
app.get('/api/events/:id/live', (req, res) => {
    const eventId = req.params.id;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); 

    // Sync toàn bộ quá khứ gởi đi lần quét đầu
    const histories = db.prepare('SELECT * FROM attendances WHERE eventId = ? ORDER BY timestamp DESC').all();
    res.write(`data: ${JSON.stringify(histories)}\n\n`);

    const clientId = Date.now();
    const newClient = { id: clientId, eventId, res };
    clients.push(newClient);

    req.on('close', () => {
        clients = clients.filter(c => c.id !== clientId);
    });
});

// Chạy 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n\n🟢 BACKEND SERVER đang chạy tại http://127.0.0.1:${PORT}\n\n(Chờ cài Frontend...)`);
});
