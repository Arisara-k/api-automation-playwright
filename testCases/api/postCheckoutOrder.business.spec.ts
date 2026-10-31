import { ENV } from "@globalVariable";
import { onOrdersTable } from "@models/ordersTable";
import { onProductsTable } from "@models/productsTable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/checkoutOrder.json";
import expectedResult from "@resources/expectedResults/checkoutOrder.json";
import commonResponse from "@resources/expectedResults/common.json";
import { onCheckoutOrderService } from "@services/checkoutOrderService";
import { onCommonFunction } from "@utils/commonFunction";

test.describe("Checkout Order RPC - Tier 2: Business Test Suite", () => {
  const checkoutOrderEndpoint = String(ENV.RPC_CHECKOUT_ORDER_PATH || "/rest/v1/rpc/checkout_order");
  let testProductId: number;
  const createdOrderIds: number[] = [];
  const createdProductIds: number[] = [];

  test.beforeAll(async () => {
    testProductId = await onProductsTable.createProduct({
      name: "Playwright Automation Test Product",
      price: 2500,
      stock: 50
    });
    createdProductIds.push(testProductId);
  });

  test.afterAll(async () => {
    await onOrdersTable.deleteOrdersByIds(createdOrderIds);
    await onProductsTable.deleteProductsByIds(createdProductIds);
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [success] when ordering available product with valid quantity", {
    tag: ["@regression", "@critical"]
  }, async () => {
    let response: Record<string, any> = {};
    let initialStock = 0;
    const checkoutPayload = {
      ...dataTest.business.validCheckout,
      p_product_id: testProductId
    };

    await test.step("Prepare Database State > Query initial product stock before order", async () => {
      const product = await onProductsTable.getProductById(testProductId);
      initialStock = Number(product?.stock ?? 0);
    });

    await test.step("Call POST checkout_order API with valid product and quantity > should create confirmed order", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: checkoutPayload
      });
    });

    await test.step("Verify API Response Shape & Status > HTTP 200 and valid schema", () => {
      onCheckoutOrderService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.ok);
    });

    await test.step("Verify Database State > Order record exists and matches response, and product stock is decremented", async () => {
      const orderId = onCheckoutOrderService.extractOrderId(response.body);
      if (orderId) {
        createdOrderIds.push(orderId);
      }
      const dbRecord = await onOrdersTable.getOrderById(orderId);
      onOrdersTable.verifyOrderMatchesDb(response.body, dbRecord);

      const productAfter = await onProductsTable.getProductById(testProductId);
      const updatedStock = Number(productAfter?.stock ?? 0);
      onProductsTable.verifyStockDecremented(initialStock, updatedStock, checkoutPayload.p_quantity);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when product does not exist in DB (non-existent p_product_id)", {
    tag: ["@regression", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with non-existent product ID > should reject with 404 resource not found", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.business.nonExistentProduct
      });
    });

    await test.step("Verify API Response > HTTP Status should be 404 Resource Not Found", () => {
      onCheckoutOrderService.verifyResourceNotFoundResponse(response);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when requested quantity exceeds available stock (insufficient stock)", {
    tag: ["@regression", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with quantity exceeding stock > should reject with 400 insufficient stock", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          ...dataTest.business.insufficientStock,
          p_product_id: testProductId
        }
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCheckoutOrderService.verifyInsufficientStockResponse(response);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when quantity is zero (boundary <= 0)", {
    tag: ["@regression", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with quantity 0 > should reject with 400 invalid quantity", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          ...dataTest.business.zeroQuantityBoundary,
          p_product_id: testProductId
        }
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCheckoutOrderService.verifyInvalidQuantityResponse(response);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when quantity is negative (< 0)", {
    tag: ["@regression", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with negative quantity > should reject with 400 invalid quantity", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          ...dataTest.business.negativeQuantity,
          p_product_id: testProductId
        }
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCheckoutOrderService.verifyInvalidQuantityResponse(response);
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when apikey / authorization header is missing", {
    tag: ["@regression", "@medium"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order without auth headers > should reject unauthorized request", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          ...dataTest.business.validCheckout,
          p_product_id: testProductId
        },
        skipDefaultAuth: true,
        headers: dataTest.headers.missingAuthHeaders
      });
    });

    await test.step("Verify API Response > HTTP Status should be 401 Unauthorized", () => {
      onCommonFunction.compareRespMsgWithExpectedFile(
        response.statusCode,
        commonResponse.httpStatus.failedCode.unauthorized,
        response.body,
        expectedResult.business.unauthorizedMissingKey
      );
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when apikey / authorization token is invalid", {
    tag: ["@regression", "@medium"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with invalid auth headers > should reject unauthorized request", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: {
          ...dataTest.business.validCheckout,
          p_product_id: testProductId
        },
        skipDefaultAuth: true,
        headers: dataTest.headers.invalidAuthHeaders
      });
    });

    await test.step("Verify API Response > HTTP Status should be 401 Unauthorized", () => {
      onCommonFunction.compareRespMsgWithExpectedFile(
        response.statusCode,
        commonResponse.httpStatus.failedCode.unauthorized,
        response.body,
        expectedResult.business.unauthorizedInvalidKey
      );
    });
  });
});
