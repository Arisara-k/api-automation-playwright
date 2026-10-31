import { ENV } from "@globalVariable";
import { onOrdersTable } from "@models/ordersTable";
import { onProductsTable } from "@models/productsTable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/orderLifecycle.e2e.json";
import commonResponse from "@resources/expectedResults/common.json";
import { onAddProductService } from "@services/addProductService";
import { onCheckoutOrderService } from "@services/checkoutOrderService";

test.describe("E2E Order Lifecycle Flow - End-to-End Test Suite", () => {
  const addProductEndpoint = String(ENV.RPC_ADD_PRODUCT_PATH || "/rest/v1/rpc/add_product");
  const checkoutOrderEndpoint = String(ENV.RPC_CHECKOUT_ORDER_PATH || "/rest/v1/rpc/checkout_order");

  const createdProductIds: number[] = [];
  const createdOrderIds: number[] = [];

  test.afterAll(async () => {
    await onOrdersTable.deleteOrdersByIds(createdOrderIds);
    await onProductsTable.deleteProductsByIds(createdProductIds);
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [success] in full E2E flow from product creation to confirmed order", {
    tag: ["@regression", "@critical", "@e2e"]
  }, async () => {
    let response: Record<string, any> = {};
    let productId = 0;
    let orderId = 0;
    const testData = dataTest.scenario1_happyPath;

    await test.step("Call POST add_product API with valid product > should create product record and return HTTP 201", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: testData.product
      });
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
      productId = onAddProductService.extractProductId(response.body);
      createdProductIds.push(productId);
    });

    await test.step("Verify Database State for Created Product > Product in DB matches request payload and has initial stock", async () => {
      const productDb = await onProductsTable.getProductById(productId);
      onProductsTable.verifyProductMatchesDb(
        {
          id: productId,
          name: testData.product.p_name,
          price: testData.product.p_price,
          stock: testData.product.p_stock
        },
        productDb
      );
    });

    await test.step("Call POST checkout_order API with newly created product > should create confirmed order and return HTTP 200", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          p_product_id: productId,
          p_quantity: testData.checkout.p_quantity
        }
      });
      onCheckoutOrderService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.ok);
      orderId = onCheckoutOrderService.extractOrderId(response.body);
      createdOrderIds.push(orderId);
    });

    await test.step("Verify Database State for Placed Order > Order record exists with CONFIRMED status and correct total_price", async () => {
      const orderDb = await onOrdersTable.getOrderById(orderId);
      onOrdersTable.verifyOrderMatchesDb(response.body, orderDb);
    });

    await test.step("Verify Database State for Product Inventory > Product stock in DB is decremented by ordered quantity", async () => {
      const productAfterDb = await onProductsTable.getProductById(productId);
      const expectedRemainingStock = testData.product.p_stock - testData.checkout.p_quantity;
      onProductsTable.verifyExactStock(productAfterDb, expectedRemainingStock);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [success] when multiple orders sequentially deplete inventory stock to zero", {
    tag: ["@regression", "@high", "@e2e"]
  }, async () => {
    let response: Record<string, any> = {};
    let productId = 0;
    const testData = dataTest.scenario2_sequentialDepletion;

    await test.step("Call POST add_product API with limited stock item > should create product record with stock 5", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: testData.product
      });
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
      productId = onAddProductService.extractProductId(response.body);
      createdProductIds.push(productId);
    });

    await test.step("Call POST checkout_order for first order (quantity 2) > should fulfill successfully and decrement stock to 3", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          p_product_id: productId,
          p_quantity: testData.firstCheckout.p_quantity
        }
      });
      onCheckoutOrderService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.ok);
      const orderId1 = onCheckoutOrderService.extractOrderId(response.body);
      createdOrderIds.push(orderId1);

      const productMidDb = await onProductsTable.getProductById(productId);
      const expectedMidStock = testData.product.p_stock - testData.firstCheckout.p_quantity;
      onProductsTable.verifyExactStock(productMidDb, expectedMidStock);
    });

    await test.step("Call POST checkout_order for second order (quantity 3) > should fulfill successfully and deplete stock to 0", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          p_product_id: productId,
          p_quantity: testData.secondCheckout.p_quantity
        }
      });
      onCheckoutOrderService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.ok);
      const orderId2 = onCheckoutOrderService.extractOrderId(response.body);
      createdOrderIds.push(orderId2);
    });

    await test.step("Verify Database State for Multi-Order Depletion > Final product stock is exactly zero and 2 orders recorded", async () => {
      const productFinalDb = await onProductsTable.getProductById(productId);
      onProductsTable.verifyExactStock(productFinalDb, 0);

      const ordersForProduct = await onOrdersTable.getOrdersByProductId(productId);
      onOrdersTable.verifyOrdersCount(ordersForProduct, 2);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when ordering product after stock is completely depleted", {
    tag: ["@regression", "@high", "@e2e"]
  }, async () => {
    let response: Record<string, any> = {};
    let productId = 0;
    const testData = dataTest.scenario3_stockExhaustionRejection;

    await test.step("Call POST add_product API with low stock > should create product record with stock 2", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: testData.product
      });
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
      productId = onAddProductService.extractProductId(response.body);
      createdProductIds.push(productId);
    });

    await test.step("Call POST checkout_order to consume all remaining stock > should confirm order and reduce stock to 0", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          p_product_id: productId,
          p_quantity: testData.depleteCheckout.p_quantity
        }
      });
      onCheckoutOrderService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.ok);
      const depleteOrderId = onCheckoutOrderService.extractOrderId(response.body);
      createdOrderIds.push(depleteOrderId);

      const depletedProductDb = await onProductsTable.getProductById(productId);
      onProductsTable.verifyExactStock(depletedProductDb, 0);
    });

    await test.step("Call POST checkout_order after inventory is depleted > should reject with 400 insufficient stock", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          p_product_id: productId,
          p_quantity: testData.rejectedCheckout.p_quantity
        }
      });
      onCheckoutOrderService.verifyInsufficientStockResponse(response);
    });

    await test.step("Verify Database State Integrity > Stock remains zero and no additional order record was created", async () => {
      const productDbAfter = await onProductsTable.getProductById(productId);
      onProductsTable.verifyExactStock(productDbAfter, 0);

      const ordersForProduct = await onOrdersTable.getOrdersByProductId(productId);
      onOrdersTable.verifyOrdersCount(ordersForProduct, 1);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [success] when ordering exact available stock quantity in a single order", {
    tag: ["@regression", "@medium", "@e2e"]
  }, async () => {
    let response: Record<string, any> = {};
    let productId = 0;
    let orderId = 0;
    const testData = dataTest.scenario4_exactStockBoundary;

    await test.step("Call POST add_product API with bulk stock > should create product record with stock 15", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: testData.product
      });
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
      productId = onAddProductService.extractProductId(response.body);
      createdProductIds.push(productId);
    });

    await test.step("Call POST checkout_order with exact available stock quantity > should create confirmed order with 15 items", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          p_product_id: productId,
          p_quantity: testData.checkout.p_quantity
        }
      });
      onCheckoutOrderService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.ok);
      orderId = onCheckoutOrderService.extractOrderId(response.body);
      createdOrderIds.push(orderId);
    });

    await test.step("Verify Database State > Order record created with exact quantity and product stock in DB becomes zero", async () => {
      const orderDb = await onOrdersTable.getOrderById(orderId);
      onOrdersTable.verifyOrderMatchesDb(response.body, orderDb);

      const productDb = await onProductsTable.getProductById(productId);
      onProductsTable.verifyExactStock(productDb, 0);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] with zero database side-effects when quantity exceeds initial stock", {
    tag: ["@regression", "@high", "@e2e"]
  }, async () => {
    let response: Record<string, any> = {};
    let productId = 0;
    const testData = dataTest.scenario5_excessQuantityRejection;

    await test.step("Call POST add_product API to establish inventory > should create product record with stock 10", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: testData.product
      });
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
      productId = onAddProductService.extractProductId(response.body);
      createdProductIds.push(productId);
    });

    await test.step("Call POST checkout_order with quantity exceeding available stock > should reject with 400 insufficient stock", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          p_product_id: productId,
          p_quantity: testData.rejectedCheckout.p_quantity
        }
      });
      onCheckoutOrderService.verifyInsufficientStockResponse(response);
    });

    await test.step("Verify Database State Isolation > Inventory stock remains unchanged and zero orders created for this product", async () => {
      const productDb = await onProductsTable.getProductById(productId);
      onProductsTable.verifyExactStock(productDb, testData.product.p_stock);

      const ordersForProduct = await onOrdersTable.getOrdersByProductId(productId);
      onOrdersTable.verifyOrdersCount(ordersForProduct, 0);
    });
  });
});
