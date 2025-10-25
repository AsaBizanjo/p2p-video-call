import db from './db.mjs'

export const newUser = (name, uuid) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO users (name, uuid) VALUES (?, ?)`;
    db.run(sql, [name, uuid], function(err) {
      if (err) return reject(err);
      resolve({ "id": this.lastID, "name": name, "uuid": uuid });
    });
  });
};

export const newRoom = (uuid) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO rooms (uuid) VALUES (?)`;
    db.run(sql, [uuid], function(err) {
      if (err) return reject(err);
      resolve({ "id": this.lastID, "roomID": uuid });
    });
  });
};

export default { newUser, newRoom };