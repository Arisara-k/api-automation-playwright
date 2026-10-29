import dotenvDefaults from "dotenv-defaults";

async function globalSetup() {
  dotenvDefaults.config({
    path: "./configs/.env",
    encoding: "utf8",
    defaults: "./configs/.env.defaults"
  });
}

export default globalSetup;
