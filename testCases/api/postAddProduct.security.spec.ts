import { ENV } from "@globalVariable";
import { onProductsTable } from "@models/productsTable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/addProduct.json";
import commonDataTest from "@resources/dataTest/common.json";
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
  // 1. Authorization Matrix & IDOR (@security @high)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/add_product] response [failed] when called with unauthorized role token (Auth Matrix)", {
    tag: ["@security", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with unauthorized role token > should reject unauthorized request", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.validProduct,
        skipDefaultAuth: true,
        headers: commonDataTest.headers.unauthorizedRoleHeaders
      });
    });

    await test.step("Verify API Response > HTTP Status should be 401 Unauthorized", () => {
      onCommonFunction.compareRespMsgWithExpectedFile(
        response.statusCode,
        commonResponse.httpStatus.failedCode.unauthorized,
        response.body,
        commonResponse.auth.unauthorizedRole
      );
    });
  });

  // ===========================================================================
  // 2. Input Tampering & Injection (@security @medium)
  // ===========================================================================
  test("POST : [/rest/v1/rpc/add_product] response [success] when payload contains SQL injection vector (Treated as literal)", {
    tag: ["@security", "@medium"]
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
      onProductsTable.verifyProductMatchesDb(
        {
          ...response.body,
          name: dataTest.security.sqlInjection.p_name,
          price: dataTest.security.sqlInjection.p_price,
          stock: dataTest.security.sqlInjection.p_stock
        },
        dbRecord
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [success] when payload contains script tags (Stored as literal string)", {
    tag: ["@security", "@medium"]
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
      onProductsTable.verifyProductMatchesDb(
        {
          ...response.body,
          name: dataTest.security.xssInjection.p_name,
          price: dataTest.security.xssInjection.p_price,
          stock: dataTest.security.xssInjection.p_stock
        },
        dbRecord
      );
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
        headers: commonDataTest.headers.expiredAuthHeaders
      });
    });

    await test.step("Verify API Response > HTTP Status should be 401 Unauthorized", () => {
      onCommonFunction.compareRespMsgWithExpectedFile(
        response.statusCode,
        commonResponse.httpStatus.failedCode.unauthorized,
        response.body,
        commonResponse.auth.unauthorizedReplay
      );
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
        onCommonFunction.verifyAllowedStatusCodes(resp.statusCode, [
          commonResponse.httpStatus.successCode.created,
          commonResponse.httpStatus.successCode.ok,
          commonResponse.httpStatus.failedCode.tooManyRequests
        ]);
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
      onCommonFunction.verifyNoSensitiveDataLeak(
        response.body,
        commonResponse.security.forbiddenPattern.prohibitedKeywords
      );
    });
  });
});
