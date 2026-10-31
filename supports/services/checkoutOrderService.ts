import { ENV } from "@globalVariable";
import { expect, request } from "@playwright/test";
import { z } from "zod";

/**
 * Zod schema defining the expected shape for successful order checkout.
 */
export const checkoutOrderSuccessSchema = z.object({
  order_id: z.coerce.number(),
  product_id: z.coerce.number(),
  quantity: z.coerce.number(),
  total_price: z.coerce.number(),
  status: z.string()
});

export interface CallApiOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  body?: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  skipDefaultAuth?: boolean;
}

class CheckoutOrderService {
  /**
   * Dispatches HTTP request via Playwright's APIRequestContext.
   * Auto-injects default Supabase headers unless skipDefaultAuth is specified.
   */
  public async callAPI(
    path: string = ENV.RPC_CHECKOUT_ORDER_PATH || "/rest/v1/rpc/checkout_order",
    options: CallApiOptions = {}
  ): Promise<{ statusCode: number; statusText: string; body: Record<string, any> }> {
    const { headers = {}, params = {}, body, method = "POST", skipDefaultAuth = false } = options;

    const authHeaders: Record<string, string> =
      !skipDefaultAuth && ENV.SUPABASE_ANON_KEY
        ? {
            apikey: ENV.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`
          }
        : {};

    const mergedHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers
    };

    // Remove keys that are explicitly passed as empty string
    for (const key of Object.keys(headers)) {
      if (headers[key] === "") {
        delete mergedHeaders[key];
      }
    }

    const ctx = await request.newContext({
      baseURL: String(ENV.API_BASE_URL),
      failOnStatusCode: false,
      ignoreHTTPSErrors: true
    });

    let rawResponse: import("@playwright/test").APIResponse;
    const requestOptions = {
      headers: mergedHeaders,
      params,
      ...(body !== undefined ? { data: body } : {})
    };

    switch (method.toUpperCase()) {
      case "POST":
        rawResponse = await ctx.post(path, requestOptions);
        break;
      case "GET":
        rawResponse = await ctx.get(path, requestOptions);
        break;
      case "PUT":
        rawResponse = await ctx.put(path, requestOptions);
        break;
      case "PATCH":
        rawResponse = await ctx.patch(path, requestOptions);
        break;
      case "DELETE":
        rawResponse = await ctx.delete(path, requestOptions);
        break;
      default:
        rawResponse = await ctx.post(path, requestOptions);
        break;
    }

    let parsedBody: Record<string, any> = {};
    try {
      parsedBody = await rawResponse.json();
    } catch {
      parsedBody = { rawText: await rawResponse.text() };
    }

    const result = {
      statusCode: rawResponse.status(),
      statusText: rawResponse.statusText(),
      body: parsedBody
    };

    await ctx.dispose();
    return result;
  }

  /**
   * Two-Layer Verification Layer 1: Asserts HTTP status code AND Zod shape simultaneously.
   */
  public verifySuccessResponse(response: Record<string, any>, expectedStatusCode = 200): void {
    expect(response.statusCode).toBe(expectedStatusCode);
    const parsed = checkoutOrderSuccessSchema.safeParse(response.body);
    const errorDetails = parsed.success ? "" : JSON.stringify(parsed.error.issues, null, 2);
    expect(parsed.success, `Response shape does not match Zod schema:\n${errorDetails}`).toBeTruthy();
  }

  /**
   * Helper to extract order ID from response body.
   * Returns numeric ID or NaN if not present.
   */
  public extractOrderId(responseBody: Record<string, any>): number {
    if (responseBody && typeof responseBody === "object") {
      if ("order_id" in responseBody && responseBody.order_id !== undefined) {
        return Number(responseBody.order_id);
      }
      if ("id" in responseBody && responseBody.id !== undefined) {
        return Number(responseBody.id);
      }
    }
    return Number(responseBody?.order_id);
  }
}

export const onCheckoutOrderService = new CheckoutOrderService();
