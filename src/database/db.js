const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('../config');

const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Enable foreign keys and WAL mode
db.run('PRAGMA foreign_keys = ON');
db.run('PRAGMA journal_mode = WAL');

function ensureSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split schema by semicolon and execute each statement
  const statements = schema.split(';').filter(s => s.trim());
  
  statements.forEach((statement) => {
    db.run(statement + ';', (err) => {
      if (err) {
        console.error('Schema error:', err);
      }
    });
  });
}

ensureSchema();

module.exports = db;
