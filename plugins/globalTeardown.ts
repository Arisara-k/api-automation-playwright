import { closeDatabaseConnection } from "./postGreSQLConnection";

async function globalTeardown() {
  await closeDatabaseConnection();
}

export default globalTeardown;
