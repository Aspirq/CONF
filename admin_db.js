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
}

const bcrypt = require("bcrypt");
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
    console.log("User added successfully");
  } catch (err) {
    console.error("Insertion error", err.stack);
  } finally {
    client.end();
  }
}

async function changeUserPassword(username, newPassword) {
  const client = connectToDatabase();
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  const changePasswordQuery = `
        UPDATE admin_login
        SET password_hash = $1
        WHERE username = $2;
    `;

  try {
    await client.query(changePasswordQuery, [hashedPassword, username]);
    console.log("Password updated successfully");
  } catch (err) {
    console.error("Update error", err.stack);
  } finally {
    client.end();
  }
}

async function checkUser(username, password) {
  const client = connectToDatabase();
  const getUserQuery = `
        SELECT password_hash FROM admin_login
        WHERE username = $1;
    `;

  try {
    const result = await client.query(getUserQuery, [username]);
    const hashedPassword = result.rows[0]?.password_hash;
    if (!hashedPassword) {
      console.log("No user found with that username");
      return false;
    }

    const match = await bcrypt.compare(password, hashedPassword);
    return match;
  } catch (err) {
    console.error("Selection error", err.stack);
    return false;
  } finally {
    client.end();
  }
}

module.exports = {
  addUser,
  changeUserPassword,
  checkUser,
};
