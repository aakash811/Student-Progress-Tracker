const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phoneNo: {
        type: String,
        required: true,
    },
    codeforcesHandle: {
        type: String,
        required: true,
    },
    currRating: {
        type: Number,
        default: 0,
    },
    rank:{
        type: String,
        default: 'Newbie',
    },
    maxRating: {
        type: Number,
        default: 0,
    },
    lastSyncedAt: {
        type: Date,
        default: Date.now,
    },
    lastActiveAt: {
        type: Date,
        default: null,
    },
    emailRemindersSent: {
        type: Number,
        default: 0,
    },
    emailRemindersDisabled: {
        type: Boolean,
        default: false,
    },
    contestData: {
        type: [Object],
        default: [],
    },
    submissions: {
        type: [Object],
        default: [],
    }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
