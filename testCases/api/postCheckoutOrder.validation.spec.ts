import { ENV } from "@globalVariable";
import { test } from "@playwright/test";
import dataTest from "@resources/dataTest/checkoutOrder.json";
import expectedResult from "@resources/expectedResults/checkoutOrder.json";
import commonResponse from "@resources/expectedResults/common.json";
import { onCheckoutOrderService } from "@services/checkoutOrderService";
import { onCommonFunction } from "@utils/commonFunction";

test.describe("Checkout Order RPC - Tier 1: Validation Test Suite", () => {
  const checkoutOrderEndpoint = String(ENV.RPC_CHECKOUT_ORDER_PATH || "/rest/v1/rpc/checkout_order");

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when mandatory p_product_id is missing", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with missing p_product_id > should return 404 signature mismatch", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.validation.missingProductId
      });
    });

    await test.step("Verify API Response > HTTP Status should be 404 Function Not Found", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.notFound,
        response.body,
        expectedResult.validation.missingParam.code,
        /schema cache/
      );
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when mandatory p_quantity is missing", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with missing p_quantity > should return 404 signature mismatch", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.validation.missingQuantity
      });
    });

    await test.step("Verify API Response > HTTP Status should be 404 Function Not Found", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.notFound,
        response.body,
        expectedResult.validation.missingParam.code,
        /schema cache/
      );
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when payload is empty JSON object", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with empty payload > should return 404 signature mismatch", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.validation.emptyPayload
      });
    });

    await test.step("Verify API Response > HTTP Status should be 404 Function Not Found", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.notFound,
        response.body,
        expectedResult.validation.missingParam.code,
        /schema cache/
      );
    });
  });

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when p_product_id format is invalid (non-integer string passed)", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with string product ID > should return 400 bigint syntax error", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.validation.invalidProductIdFormat
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

  test("POST : [/rest/v1/rpc/checkout_order] response [failed] when p_quantity format is invalid (decimal number passed)", {
    tag: ["@functional", "@high"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call POST checkout_order with decimal quantity > should return 400 integer syntax error", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "POST",
        body: dataTest.validation.invalidQuantityFormat
      });
    });

    await test.step("Verify API Response > HTTP Status should be 400 Bad Request", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.badRequest,
        response.body,
        expectedResult.validation.invalidIntegerSyntax.code,
        /invalid input syntax for type integer/
      );
    });
  });

  test("DELETE : [/rest/v1/rpc/checkout_order] response [failed] when HTTP method is not allowed on RPC", {
    tag: ["@functional", "@medium"]
  }, async () => {
    let response: Record<string, any> = {};

    await test.step("Call DELETE on RPC endpoint > should reject unsupported HTTP method with 405", async () => {
      response = await onCheckoutOrderService.callAPI(checkoutOrderEndpoint, {
        method: "DELETE"
      });
    });

    await test.step("Verify API Response > HTTP Status should be 405 Method Not Allowed", () => {
      onCommonFunction.compareRespMsgWithPattern(
        response.statusCode,
        commonResponse.httpStatus.failedCode.methodNotAllowed,
        response.body,
        expectedResult.validation.methodNotAllowed.code,
        /Cannot use the DELETE method on RPC/
      );
    });
  });
});
