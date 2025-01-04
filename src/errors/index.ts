interface BugReportErrorData {
  code: number;
  status: "success" | "error";
  message: string;
}

/**
 * Represents a base error for the bug report client.
 */
export class BugReportClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BugReportClientError";
  }
}

/**
 * Represents an error that occurs when an API request fails.
 * Extends the `BugReportClientError` class.
 */
export class ApiBugReportError extends BugReportClientError {
  constructor(errorData: BugReportErrorData) {
    super(`API Error [${errorData.code}]: ${errorData.message}`);
    this.name = "ApiBugReportError";
  }
}

/**
 * Represents an error that occurs when a bug report is not found.
 * Extends the `BugReportClientError` class.
 */
export class NotFoundBugReportError extends BugReportClientError {
  constructor(errorData: BugReportErrorData) {
    super(`Not Found Error [${errorData.code}]: ${errorData.message}`);
    this.name = "NotFoundBugReportError";
  }
}
