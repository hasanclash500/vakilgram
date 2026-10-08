export function providerErrorCode(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "TIMEOUT";
    }

    if (error.name === "ZodError") {
      return "INVALID_SCHEMA";
    }

    if (error instanceof SyntaxError) {
      return "INVALID_JSON";
    }

    const httpMatch = error.message.match(/\bHTTP\s+(\d{3})\b/i);
    if (httpMatch?.[1]) {
      return "HTTP_" + httpMatch[1];
    }

    const message = error.message.toLowerCase();

    if (message.includes("empty embedding")) {
      return "EMPTY_EMBEDDING";
    }

    if (message.includes("empty response")) {
      return "EMPTY_RESPONSE";
    }

    if (message.includes("invalid embedding")) {
      return "INVALID_EMBEDDING";
    }
  }

  return "PROVIDER_ERROR";
}
