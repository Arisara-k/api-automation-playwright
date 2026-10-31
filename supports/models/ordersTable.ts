import { expect } from "@playwright/test";
import { query } from "@plugins/postGreSQLConnection";

export interface OrderRecord {
  id: number;
  product_id: number;
  quantity: number;
  total_price: string | number;
  status: string;
  created_at?: string;
}

class OrdersTable {
  /**
   * Queries order record by primary key (ID) using Direct PostgreSQL Connection.
   */
  public async getOrderById(orderId: number | string): Promise<OrderRecord | null> {
    const rows = await query<OrderRecord>(
      "SELECT id, product_id, quantity, total_price, status, created_at FROM orders WHERE id = $1 LIMIT 1",
      [orderId]
    );
    return rows[0] || null;
  }

  /**
   * Queries all order records by product ID using Direct PostgreSQL Connection.
   */
  public async getOrdersByProductId(productId: number | string): Promise<OrderRecord[]> {
    const rows = await query<OrderRecord>(
      "SELECT id, product_id, quantity, total_price, status, created_at FROM orders WHERE product_id = $1 ORDER BY id ASC",
      [productId]
    );
    return rows;
  }

  /**
   * Asserts that API response body matches persistent database state in orders table.
   */
  public verifyOrderMatchesDb(responseBody: Record<string, any>, dbRecord: OrderRecord | null): void {
    expect(
      dbRecord,
      `Expected DB record for order ID ${responseBody.order_id || "N/A"} to exist in database`
    ).not.toBeNull();

    const record = dbRecord as OrderRecord;

    if (responseBody.order_id !== undefined) {
      expect(Number(record.id)).toBe(Number(responseBody.order_id));
    }

    if (responseBody.product_id !== undefined) {
      expect(Number(record.product_id)).toBe(Number(responseBody.product_id));
    }

    if (responseBody.quantity !== undefined) {
      expect(Number(record.quantity)).toBe(Number(responseBody.quantity));
    }

    if (responseBody.total_price !== undefined) {
      expect(Number(record.total_price)).toBe(Number(responseBody.total_price));
    }

    if (responseBody.status !== undefined) {
      expect(record.status).toBe(responseBody.status);
    }
  }

  /**
   * Asserts the count of orders for a given product or scope.
   */
  public verifyOrdersCount(orders: OrderRecord[], expectedCount: number): void {
    expect(orders.length, `Expected ${expectedCount} orders in DB, but found ${orders.length}`).toBe(expectedCount);
  }

  /**
   * Cleans up created test orders by IDs.
   */
  public async deleteOrdersByIds(orderIds: (number | string)[]): Promise<void> {
    if (!orderIds || orderIds.length === 0) {
      return;
    }
    await query("DELETE FROM orders WHERE id = ANY($1::bigint[])", [orderIds]);
  }
}

export const onOrdersTable = new OrdersTable();
