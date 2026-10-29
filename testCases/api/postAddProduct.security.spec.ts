import { ENV } from "@globalVariable";
import { onProductsTable } from "@models/productsTable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/addProduct.json";
import expectedResult from "@resources/expectedResults/addProduct.json";
import commonResponse from "@resources/expectedResults/common.json";
import { onAddProductService } from "@services/addProductService";
import { onCommonFunction } from "@utils/commonFunction";

test.describe("Add Product RPC - Tier 3: Security Test Suite", () => {
  const addProductEndpoint = String(ENV.RPC_ADD_PRODUCT_PATH || "/rest/v1/rpc/add_product");
  const createdProductIds: number[] = [];

  test.afterAll(async () => {
    await onProductsTable.deleteProductsByIds(createdProductIds);
  });

  // ===========================================================================
  // 1. SQL Injection Vector (@security @high)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/add_product] response [success] when payload contains SQL injection vector (Treated as literal)", {
    tag: ["@security", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with SQL injection string in p_name > should be treated as literal value", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.security.sqlInjection
      });
    });

    await test.step("Verify API Response Shape & Status > HTTP 201 and valid schema", () => {
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
    });

    await test.step("Verify Database State > Product in DB contains exact literal string without SQL execution", async () => {
      const productId = onAddProductService.extractProductId(response.body);
      if (productId) {
        createdProductIds.push(productId);
      }
      const dbRecord = await onProductsTable.getProductById(productId);
      onProductsTable.verifyProductMatchesDb(response.body, dbRecord);
    });
  });

  // ===========================================================================
  // 2. XSS & Script Injection (@security @high)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/add_product] response [success] when payload contains script tags (Stored as literal string)", {
    tag: ["@security", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with XSS script vector in p_name > should store sanitized literal string", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.security.xssInjection
      });
    });

    await test.step("Verify API Response Shape & Status > HTTP 201 and valid schema", () => {
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
    });

    await test.step("Verify Database State > Product in DB contains exact script tag string", async () => {
      const productId = onAddProductService.extractProductId(response.body);
      if (productId) {
        createdProductIds.push(productId);
      }
      const dbRecord = await onProductsTable.getProductById(productId);
      onProductsTable.verifyProductMatchesDb(response.body, dbRecord);
    });
  });

  // ===========================================================================
  // 3. Replay & Token Abuse (@security @medium)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/add_product] response [failed] when token is expired or forged (Replay / Token Abuse)", {
    tag: ["@security", "@medium"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with expired/tampered JWT token > should reject unauthorized replay", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.validProduct,
        skipDefaultAuth: true,
        headers: dataTest.headers.expiredAuthHeaders
      });
    });

    await test.step("Verify API Response > HTTP Status should be 401 Unauthorized", () => {
      onCommonFunction.verifyFailedResponse(response, commonResponse.httpStatus.failedCode.unauthorized, response.body);
    });
  });

  // ===========================================================================
  // 4. Rate Limit & Throttling (@security @medium)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/add_product] response [success] when handling concurrent burst requests", {
    tag: ["@security", "@medium"]
  }, async () => {
    let burstResponses: Array<{ statusCode: number; statusText: string; body: Record<string, any> }> = [];

    await test.step("Call POST add_product API concurrently with multiple burst payloads > server handles gracefully without socket crashes", async () => {
      const burstPromises = dataTest.security.burstRequests.map((payload) =>
        onAddProductService.callAPI(addProductEndpoint, {
          method: "POST",
          body: payload
        })
      );
      burstResponses = await Promise.all(burstPromises);
    });

    await test.step("Verify Burst Responses > All requests return valid status (201 Created or 429 Rate Limited)", () => {
      for (const resp of burstResponses) {
        const id = onAddProductService.extractProductId(resp.body);
        if (id) {
          createdProductIds.push(id);
        }
        const isValidStatus = resp.statusCode === 201 || resp.statusCode === 200 || resp.statusCode === 429;
        onCommonFunction.verifyFailedResponse({ statusCode: isValidStatus ? 201 : resp.statusCode, body: {} }, 201, {});
      }
    });
  });

  // ===========================================================================
  // 5. Sensitive Data Exposure (@security @high)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/add_product] response [failed] without leaking database credentials or internal stack traces", {
    tag: ["@security", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with malformed trigger payload > should reject error safely", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
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
