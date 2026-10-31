import path from "node:path";
import dotenvDefaults from "dotenv-defaults";

async function globalSetup() {
  dotenvDefaults.config({
    path: path.resolve(__dirname, "../configs/.env"),
    encoding: "utf8",
    defaults: path.resolve(__dirname, "../configs/.env.defaults")
  });
}

export default globalSetup;
