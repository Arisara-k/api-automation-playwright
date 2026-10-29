import { ENV } from "@globalVariable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/addProduct.json";
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

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCommonFunction.verifyFailedResponse(response, commonResponse.httpStatus.failedCode.badRequest, response.body);
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

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCommonFunction.verifyFailedResponse(response, commonResponse.httpStatus.failedCode.badRequest, response.body);
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

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCommonFunction.verifyFailedResponse(response, commonResponse.httpStatus.failedCode.badRequest, response.body);
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

    await test.step("Verify API Response > HTTP Status should be 404 Function Not Found", () => {
      onCommonFunction.verifyFailedResponse(response, commonResponse.httpStatus.failedCode.notFound, response.body);
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

    await test.step("Verify API Response > HTTP Status should be 405 Method Not Allowed", () => {
      onCommonFunction.verifyFailedResponse(
        response,
        commonResponse.httpStatus.failedCode.methodNotAllowed,
        response.body
      );
    });
  });
});
