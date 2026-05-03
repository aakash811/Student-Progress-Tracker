require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const studentRoutes = require('./routes/studentRoutes');
const codeforcesRoutes = require('./routes/codeforcesRoutes');
const inactivityRoutes = require('./routes/inactivityRoutes');
const cronRoutes = require('./routes/cron');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/students', studentRoutes);
app.use('/api/codeforces', codeforcesRoutes);
app.use('/api/inactivity', inactivityRoutes);
app.use('/cron', cronRoutes);

// Health check — cron-job.org pings this to keep Render warm
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.get('/debug/redis', async (req, res) => {
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    try {
        await redis.set('test', 'ok');
        const val = await redis.get('test');
        res.json({ status: 'Redis working', val });
    } catch (err) {
        res.json({ status: 'Redis failed', error: err.message });
    }
});

mongoose.connect(MONGO_URI).then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((error) => console.log('MongoDB connection error:', error));
