const { Client } = require("pg");
function connectToDatabase() {
  const client = new Client({
    user: "conf_user",
    host: "localhost",
    database: "conf_db",
    password: "zxcvb",
    port: 5432,
  });
  client.connect();
  return client;
};

const bcrypt = require('bcrypt');
const saltRounds = 10;

async function addUser(username, password) {
    const client = connectToDatabase();
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const addUserQuery = `
        INSERT INTO admin_login (username, password_hash)
        VALUES ($1, $2);
    `;

    try {
        await client.query(addUserQuery, [username, hashedPassword]);
        console.log('User added successfully');
    } catch (err) {
        console.error('Insertion error', err.stack);
    } finally {
        client.end();
    }
};
