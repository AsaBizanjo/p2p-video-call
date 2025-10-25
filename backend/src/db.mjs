import sqlite3 from 'sqlite3'


const dbName = 'video-call.sqlite'

sqlite3.verbose();

const db = new sqlite3.Database(dbName, (err) => {
  if (err) {
    console.error('Error creating/opening database:', err.message);
  } else {
    console.log('Connected to the database.');
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, uuid TEXT)`, (err) => {
        if (err){
            console.error(err.message)
        } else{
            db.run(`CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT)`, (err) => {
                if (err){
                    console.error(err.message)
                } else{
                    console.log('DB is fully functional')
                }
            })
        }
    })
  }
});

export default db;