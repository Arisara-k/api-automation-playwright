import { ENV } from "@globalVariable";
import { onOrdersTable } from "@models/ordersTable";
import { onProductsTable } from "@models/productsTable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/checkoutOrder.json";
import expectedResult from "@resources/expectedResults/checkoutOrder.json";
import commonResponse from "@resources/expectedResults/common.json";
import { onCheckoutOrderService } from "@services/checkoutOrderService";
import { onCommonFunction } from "@utils/commonFunction";

test.describe("Checkout Order RPC - Tier 3: Security Test Suite", () => {
  const checkoutOrderEndpoint = String(ENV.RPC_CHECKOUT_ORDER_PATH || "/rest/v1/rpc/checkout_order");
  let burstProductId: number;
  const createdOrderIds: number[] = [];
  const createdProductIds: number[] = [];

  test.beforeAll(async () => {
    burstProductId = await onProductsTable.createProduct({
      name: "Security Burst Test Product",
      price: 100,
      stock: 50
    });
    createdProductIds.push(burstProductId);
  });

  test.afterAll(async () => {
    await onOrdersTable.deleteOrdersByIds(createdOrderIds);
    await onProductsTable.deleteProductsByIds(createdProductIds);
  });

  // ===========================================================================
  // 1. SQL Injection Vector (@security @high)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when payload contains SQL injection in parameter", {
    tag: ["@security", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order API with SQL injection string in p_product_id > should reject type error safely", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.security.sqlInjection
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.badRequest,
        response.body,
        expectedResult.validation.invalidBigintSyntax.code,
        /invalid input syntax for type bigint/
      );
    });
  });

  // ===========================================================================
  // 2. XSS & Malicious Input (@security @high)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when payload contains XSS / malicious script payload", {
    tag: ["@security", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order API with XSS script vector in p_product_id > should reject type error safely", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.security.xssInjection
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.badRequest,
        response.body,
        expectedResult.validation.invalidBigintSyntax.code,
        /invalid input syntax for type bigint/
      );
    });
  });

  // ===========================================================================
  // 3. Replay & Token Abuse (@security @medium)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when token is expired or forged (Replay / Token Abuse)", {
    tag: ["@security", "@medium"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order API with expired/tampered JWT token > should reject unauthorized replay", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.business.validCheckout,
        skipDefaultAuth: true,
        headers: dataTest.headers.expiredAuthHeaders
      });
    });

    await test.step("Verify API Response > HTTP Status should be 401 Unauthorized", () => {
      onCommonFunction.compareRespMsgWithExpectedFile(
        response.statusCode,
        commonResponse.httpStatus.failedCode.unauthorized,
        response.body,
        expectedResult.security.unauthorizedReplay
      );
    });
  });

  // ===========================================================================
  // 4. Rate Limit & Throttling / Concurrency (@security @medium)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/checkout_order] response [success] when handling concurrent burst checkout requests", {
    tag: ["@security", "@medium"]
  }, async () => {
    let burstResponses: Array<{ statusCode: number; statusText: string; body: Record<string, any> }> = [];

    await test.step("Call POST checkout_order API concurrently with multiple burst payloads > server handles gracefully without socket crashes", async () => {
      const burstPromises = dataTest.security.burstRequests.map((payload) =>
        onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
          method: "POST",
          body: {
            ...payload,
            p_product_id: burstProductId
          }
        })
      );
      burstResponses = await Promise.all(burstPromises);
    });

    await test.step("Verify Burst Responses > All requests return valid status (200 OK, 400 Bad Request, or 429 Rate Limited)", () => {
      for (const resp of burstResponses) {
        const id = onCheckoutOrderService.extractOrderId(resp.body);
        if (id) {
          createdOrderIds.push(id);
        }
        const isValidStatus = resp.statusCode === 200 || resp.statusCode === 400 || resp.statusCode === 429;
        onCommonFunction.verifyFailedResponse({ statusCode: isValidStatus ? 200 : resp.statusCode, body: {} }, 200, {});
      }
    });
  });

  // ===========================================================================
  // 5. Sensitive Data Exposure (@security @high)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/checkout_order] response [failed] without leaking database credentials or internal stack traces", {
    tag: ["@security", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order API with malformed trigger payload > should reject error safely", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.security.sensitiveDataPayload
      });
    });

    await test.step("Verify Error Response > Response body must not leak sensitive DB credentials or file system paths", () => {
      const bodyStr = JSON.stringify(response.body).toLowerCase();
      const hasLeak = expectedResult.security.forbiddenPattern.prohibitedKeywords.some((keyword) =>
        bodyStr.includes(keyword.toLowerCase())
      );
      onCommonFunction.verifyFailedResponse(
        { statusCode: hasLeak ? 500 : response.statusCode, body: { leaked: hasLeak } },
        response.statusCode,
        { leaked: false }
      );
    });
  });
});
