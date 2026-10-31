import { expect } from "@playwright/test";
import { query } from "@plugins/postGreSQLConnection";

export interface ProductRecord {
  id: number;
  name: string;
  price: string | number;
  stock: number;
}

class ProductsTable {
  /**
   * Queries product record by primary key (ID) using Direct PostgreSQL Connection.
   * Throws if DB connection or query fails.
   */
  public async getProductById(productId: number | string): Promise<ProductRecord | null> {
    const rows = await query<ProductRecord>("SELECT id, name, price, stock FROM products WHERE id = $1 LIMIT 1", [
      productId
    ]);
    return rows[0] || null;
  }

  /**
   * Asserts that API response body matches persistent database state.
   * Fails test if DB record is not found or values mismatch.
   */
  public verifyProductMatchesDb(responseBody: Record<string, any>, dbRecord: ProductRecord | null): void {
    expect(
      dbRecord,
      `Expected DB record for product ID ${responseBody.id || "N/A"} to exist in database`
    ).not.toBeNull();

    const record = dbRecord as ProductRecord;

    if (responseBody.name !== undefined) {
      expect(record.name, `DB name mismatch: expected ${responseBody.name}, got ${record.name}`).toEqual(
        responseBody.name
      );
    }

    if (responseBody.price !== undefined) {
      const expectedPrice = Number(responseBody.price);
      expect(Number(record.price), `DB price mismatch: expected ${expectedPrice}, got ${record.price}`).toEqual(
        expectedPrice
      );
    }

    if (responseBody.stock !== undefined) {
      const expectedStock = Number(responseBody.stock);
      expect(Number(record.stock), `DB stock mismatch: expected ${expectedStock}, got ${record.stock}`).toEqual(
        expectedStock
      );
    }
  }

  /**
   * Asserts that product stock was correctly decremented by ordered quantity.
   */
  public verifyStockDecremented(beforeStock: number, afterStock: number, quantity: number): void {
    expect(
      afterStock,
      `Product stock decrement mismatch: before=${beforeStock}, quantity=${quantity}, expected after=${beforeStock - quantity}, got=${afterStock}`
    ).toBe(beforeStock - quantity);
  }

  /**
   * Asserts that product stock matches expected value exactly.
   */
  public verifyExactStock(dbRecord: ProductRecord | null, expectedStock: number): void {
    expect(dbRecord, "Expected product record to exist in database").not.toBeNull();
    const record = dbRecord as ProductRecord;
    expect(Number(record.stock), `Product stock mismatch: expected ${expectedStock}, got ${record.stock}`).toBe(
      expectedStock
    );
  }

  /**
   * Inserts a test product directly for test isolation.
   */
  public async createProduct(product: { name: string; price: number; stock: number }): Promise<number> {
    const rows = await query<{ id: number }>(
      "INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING id",
      [product.name, product.price, product.stock]
    );
    return Number(rows[0].id);
  }

  public async deleteProductsByIds(productIds: (number | string)[]): Promise<void> {
    if (!productIds || productIds.length === 0) {
      return;
    }
    await query("DELETE FROM products WHERE id = ANY($1::bigint[])", [productIds]);
  }
}

export const onProductsTable = new ProductsTable();
