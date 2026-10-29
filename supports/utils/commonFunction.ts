import { expect } from "@playwright/test";

class CommonFunction {
  /**
   * Compares the actual status code and response body with expected fixtures.
   * Logs clean expected vs actual diff on mismatch.
   */
  public compareRespMsgWithExpectedFile(
    statusCode: number,
    expectedCode: number,
    actualBody: Record<string, any>,
    expectedBody: Record<string, any>
  ): void {
    expect(statusCode, `Status code mismatch: expected ${expectedCode}, got ${statusCode}`).toEqual(expectedCode);
    expect(
      actualBody,
      `Response body mismatch:\nExpected: ${JSON.stringify(expectedBody, null, 2)}\nActual:   ${JSON.stringify(actualBody, null, 2)}`
    ).toEqual(expectedBody);
  }

  /**
   * Validates error response with status code, machine-readable error code, and regex message pattern.
   */
  public compareRespMsgWithPattern(
    statusCode: number,
    expectedCode: number,
    actualBody: Record<string, any>,
    expectedErrorCode: string,
    messagePattern: RegExp
  ): void {
    expect(statusCode, `Status code mismatch: expected ${expectedCode}, got ${statusCode}`).toEqual(expectedCode);
    expect(actualBody.code || (actualBody.error && actualBody.error.code)).toEqual(expectedErrorCode);
    expect(actualBody.message || (actualBody.error && actualBody.error.message)).toMatch(messagePattern);
  }

  /**
   * Simple failed response verification shorthand.
   */
  public verifyFailedResponse(
    actualResult: Record<string, any>,
    expectedCode: number,
    expectedResult: Record<string, any>
  ): void {
    expect(actualResult.statusCode).toBe(expectedCode);
    expect(actualResult.body).toEqual(expectedResult);
  }
}

export const onCommonFunction: CommonFunction = new CommonFunction();
