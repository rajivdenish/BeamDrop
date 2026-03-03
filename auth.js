const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

// Ensure database file exists
function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        const initialStructure = { users: [], invites: [], sessions: {} };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialStructure, null, 2));
        return initialStructure;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Security Helper Functions
function hashPassword(plainText) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(plainText, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(plainText, hashStr) {
    const [salt, key] = hashStr.split(':');
    const hashedBuffer = crypto.scryptSync(plainText, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    const match = crypto.timingSafeEqual(hashedBuffer, keyBuffer);
    return match;
}

module.exports = {
    loadDB,
    saveDB,
    hashPassword,
    verifyPassword
};
