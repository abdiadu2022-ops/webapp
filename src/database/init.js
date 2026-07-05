// Run with: npm run init-db
// Creates the SQLite file and applies schema.sql (idempotent).
const db = require('./db');

console.log('Database initialized at', db.name);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all()
  .map((r) => r.name);

console.log('Tables:', tables.join(', '));
db.close();
