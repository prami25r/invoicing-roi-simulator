// /backend/database.js
const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = 'scenarios.db';

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
        // Create scenarios table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS scenarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            inputs TEXT,
            results TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        // Create leads table for email capture
        db.run(`CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

module.exports = db;