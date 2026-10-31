import { ENV } from "@globalVariable";
import { onProductsTable } from "@models/productsTable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/addProduct.json";
import commonDataTest from "@resources/dataTest/common.json";
import expectedResult from "@resources/expectedResults/addProduct.json";
import commonResponse from "@resources/expectedResults/common.json";
import { onAddProductService } from "@services/addProductService";
import { onCommonFunction } from "@utils/commonFunction";

test.describe("Add Product RPC - Tier 2: Business Test Suite", () => {
  const addProductEndpoint = String(ENV.RPC_ADD_PRODUCT_PATH || "/rest/v1/rpc/add_product");
  const createdProductIds: number[] = [];

  test.afterAll(async () => {
    await onProductsTable.deleteProductsByIds(createdProductIds);
  });

  test("POST : [/rest/v1/rpc/add_product] response [success] when payload is valid standard product", {
    tag: ["@regression", "@critical"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with valid standard product > should create product record", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.validProduct
      });
    });

    await test.step("Verify API Response Shape & Status > HTTP 201 and valid schema", () => {
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
    });

    await test.step("Verify Database State > Product in DB matches API response", async () => {
      const productId = onAddProductService.extractProductId(response.body);
      if (productId) {
        createdProductIds.push(productId);
      }
      const dbRecord = await onProductsTable.getProductById(productId);
      onProductsTable.verifyProductMatchesDb(
        {
          ...response.body,
          name: dataTest.business.validProduct.p_name,
          price: dataTest.business.validProduct.p_price,
          stock: dataTest.business.validProduct.p_stock
        },
        dbRecord
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [success] when price is 0.00 (free product boundary)", {
    tag: ["@regression", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with zero price > should create free product successfully", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.freeProductBoundary
      });
    });

    await test.step("Verify API Response Shape & Status > HTTP 201 and valid schema", () => {
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
    });

    await test.step("Verify Database State > Product in DB matches API response with 0.00 price", async () => {
      const productId = onAddProductService.extractProductId(response.body);
      if (productId) {
        createdProductIds.push(productId);
      }
      const dbRecord = await onProductsTable.getProductById(productId);
      onProductsTable.verifyProductMatchesDb(
        {
          ...response.body,
          name: dataTest.business.freeProductBoundary.p_name,
          price: dataTest.business.freeProductBoundary.p_price,
          stock: dataTest.business.freeProductBoundary.p_stock
        },
        dbRecord
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [success] when stock is 0 (out of stock boundary)", {
    tag: ["@regression", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with zero stock > should create out-of-stock product successfully", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.zeroStockBoundary
      });
    });

    await test.step("Verify API Response Shape & Status > HTTP 201 and valid schema", () => {
      onAddProductService.verifySuccessResponse(response, commonResponse.httpStatus.successCode.created);
    });

    await test.step("Verify Database State > Product in DB matches API response with 0 stock", async () => {
      const productId = onAddProductService.extractProductId(response.body);
      if (productId) {
        createdProductIds.push(productId);
      }
      const dbRecord = await onProductsTable.getProductById(productId);
      onProductsTable.verifyProductMatchesDb(
        {
          ...response.body,
          name: dataTest.business.zeroStockBoundary.p_name,
          price: dataTest.business.zeroStockBoundary.p_price,
          stock: dataTest.business.zeroStockBoundary.p_stock
        },
        dbRecord
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [failed] when price is negative (< 0)", {
    tag: ["@regression", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with negative price > should reject domain rule violation", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.negativePrice
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request with price range error", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.badRequest,
        response.body,
        expectedResult.business.negativePrice.error.code,
        /Price cannot be less than zero/
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [failed] when stock is negative (< 0)", {
    tag: ["@regression", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with negative stock > should reject domain rule violation", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.negativeStock
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request with negative stock error", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.badRequest,
        response.body,
        expectedResult.business.negativeStock.error.code,
        /Stock cannot be negative/
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [failed] when apikey / authorization header is missing", {
    tag: ["@regression", "@medium"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API without authentication headers > should reject unauthorized request", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.validProduct,
        skipDefaultAuth: true,
        headers: commonDataTest.headers.missingAuthHeaders
      });
    });

    await test.step("Verify API Response > HTTP Status should be 401 Unauthorized", () => {
      onCommonFunction.compareRespMsgWithExpectedFile(
        response.statusCode,
        commonResponse.httpStatus.failedCode.unauthorized,
        response.body,
        commonResponse.auth.unauthorizedMissingKey
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [failed] when apikey / authorization token is invalid", {
    tag: ["@regression", "@medium"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product API with invalid authentication token > should reject unauthorized request", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.business.validProduct,
        skipDefaultAuth: true,
        headers: commonDataTest.headers.invalidAuthHeaders
      });
    });

    await test.step("Verify API Response > HTTP Status should be 401 Unauthorized", () => {
      onCommonFunction.compareRespMsgWithExpectedFile(
        response.statusCode,
        commonResponse.httpStatus.failedCode.unauthorized,
        response.body,
        commonResponse.auth.unauthorizedInvalidKey
      );
    });
  });
});
