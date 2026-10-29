import dotenvDefaults from "dotenv-defaults";

dotenvDefaults.config({
  path: "./configs/.env",
  encoding: "utf8",
  defaults: "./configs/.env.defaults"
});

/**
 * Global Environment configuration and Path Constants.
 */
export const ENV = {
  ...process.env,
  API_BASE_URL: process.env.SUPABASE_URL || "https://lgfbvbygahvzpscabvrq.supabase.co",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  RPC_ADD_PRODUCT_PATH: process.env.RPC_ADD_PRODUCT_PATH || "/rest/v1/rpc/add_product",
  REST_PRODUCTS_PATH: process.env.REST_PRODUCTS_PATH || "/rest/v1/products"
};
