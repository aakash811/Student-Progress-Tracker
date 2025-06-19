require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const studentRoutes = require('./routes/studentRoutes');
const codeforcesRoutes = require('./routes/codeforcesRoutes');
const inactivityRoutes = require('./routes/inactivityRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/students', studentRoutes);
app.use('/api/codeforces', codeforcesRoutes);
app.use('/api/inactivity', inactivityRoutes);

const scheduleCodeforcesSync = require('./cron/codeforcesSyncCron');
scheduleCodeforcesSync();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
}).then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((error) => console.log('MongoDB connection error:', error));
