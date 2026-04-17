import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                phone VARCHAR(255),
                fullName VARCHAR(255),
                role VARCHAR(50)
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS events (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255),
                lat FLOAT,
                lng FLOAT,
                radius INTEGER,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS attendances (
                userId VARCHAR(255),
                eventId VARCHAR(255),
                userName VARCHAR(255),
                phone VARCHAR(255),
                selfieUrl TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (userId, eventId)
            );
        `;

        return res.status(200).json({ success: true, message: 'Database tables initialized successfully!' });
    } catch (error) {
        console.error('Database initialization error:', error);
        return res.status(500).json({ error: 'Failed to initialize database', details: error.message });
    }
}
