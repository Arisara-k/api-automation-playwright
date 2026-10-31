import { ENV } from "@globalVariable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/addProduct.json";
import expectedResult from "@resources/expectedResults/addProduct.json";
import commonResponse from "@resources/expectedResults/common.json";
import { onAddProductService } from "@services/addProductService";
import { onCommonFunction } from "@utils/commonFunction";

test.describe("Add Product RPC - Tier 1: Validation Test Suite", () => {
  const addProductEndpoint = String(ENV.RPC_ADD_PRODUCT_PATH || "/rest/v1/rpc/add_product");

  test("POST : [/rest/v1/rpc/add_product] response [failed] when product name is empty string", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product with empty product name > should reject with validation error", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.validation.emptyName
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request with empty name error", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.badRequest,
        response.body,
        expectedResult.validation.emptyName.error.code,
        /Product name cannot be empty/
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [failed] when price format is invalid (string passed)", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product with non-numeric price string > should reject with format error", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.validation.invalidPriceFormat
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request with invalid price format error", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.badRequest,
        response.body,
        expectedResult.validation.invalidPriceFormat.error.code,
        /Price must be a valid number/
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [failed] when stock format is invalid (decimal passed)", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product with decimal stock value > should reject integer format error", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.validation.invalidStockFormat
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request with invalid stock format error", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.badRequest,
        response.body,
        expectedResult.validation.invalidStockFormat.error.code,
        /Stock must be an integer/
      );
    });
  });

  test("POST : [/rest/v1/rpc/add_product] response [failed] when required parameter is missing in payload", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST add_product with missing required p_name > should return 404 signature mismatch", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "POST",
        body: dataTest.validation.missingRequiredParam
      });
    });

    await test.step("Verify API Response > HTTP Status should be 404 Function Not Found with schema cache error", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.notFound,
        response.body,
        expectedResult.validation.missingRequiredParam.code,
        /schema cache/
      );
    });
  });

  test("DELETE : [/rest/v1/rpc/add_product] response [failed] when HTTP method is not allowed on RPC", {
    tag: ["@functional", "@medium"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call DELETE on RPC endpoint > should reject unsupported HTTP method", async () => {
      response = await onAddProductService.callAPI(addProductEndpoint, {
        method: "DELETE"
      });
    });

    await test.step("Verify API Response > HTTP Status should be 405 Method Not Allowed with RPC method error", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.methodNotAllowed,
        response.body,
        commonResponse.rpc.methodNotAllowed.code,
        new RegExp(commonResponse.rpc.methodNotAllowed.message)
      );
    });
  });
});
