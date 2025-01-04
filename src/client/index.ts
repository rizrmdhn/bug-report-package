import fetch from "cross-fetch";
import {
  BugReport,
  BugReportSchema,
  BugReportApiResponse,
  BugReportResponse,
  ApiErrorResponse,
} from "../types";
import { ApiBugReportError, NotFoundBugReportError } from "../errors";

export interface BugReportClientOptions {
  apiUrl: string;
  appName: string;
  appKey: string;
  appSecret: string;
  headers?: Record<string, string>;
}

/**
 * The `BugReportClient` class provides methods to interact with the bug report API.
 */
export class BugReportClient {
  /**
   * The base URL of the API.
   */
  private apiUrl: string;

  /**
   * The headers to be included in API requests.
   */
  private headers: Record<string, string>;

  /**
   * Creates an instance of `BugReportClient`.
   *
   * @param options - The options for configuring the client.
   * @throws Will throw an error if the `apiUrl` is not provided.
   * @throws Will throw an error if the app credentials (`appName`, `appKey`, `appSecret`) are not provided.
   */
  constructor(options: BugReportClientOptions) {
    if (!options.apiUrl) {
      throw new Error("API URL is required");
    }

    if (!options.appName || !options.appKey || !options.appSecret) {
      throw new Error(
        "App credentials (App Name, App Key, App Secret) are required"
      );
    }

    this.apiUrl = options.apiUrl;
    this.headers = {
      "Content-Type": "application/json",
      "X-App-Name": options.appName,
      "X-App-Key": options.appKey,
      Authorization: `Bearer ${options.appSecret}`,
      ...(options.headers ?? {}),
    };
  }

  /**
   * Submits a bug report to the API.
   *
   * @param report - The bug report to be submitted.
   * @returns A promise that resolves to the response from the API.
   * @throws Will throw an error if the bug report data is invalid.
   * @throws Will throw an error if the API response is not successful.
   */
  async submitBugReport(report: BugReport): Promise<BugReportResponse> {
    try {
      BugReportSchema.parse(report);
    } catch (error) {
      throw new Error(`Invalid bug report data: ${error}`);
    }

    const response = await fetch(`${this.apiUrl}/bugs/reports`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        ...report,
        createdAt: report.createdAt ?? new Date(),
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new ApiBugReportError(data.meta);
    }

    return response.json();
  }

  /**
   * Retrieves a bug report by its ID.
   *
   * @param id - The ID of the bug report to retrieve.
   * @returns A promise that resolves to the bug report data from the API.
   * @throws Will throw an error if the API response is not successful.
   * @throws Will throw a `NotFoundBugReportError` if the bug report is not found.
   */
  async getBugReport(id: string): Promise<BugReportApiResponse> {
    const response = await fetch(`${this.apiUrl}/bugs/${id}`, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse;

      if (response.status === 404) {
        throw new NotFoundBugReportError(errorData.meta);
      }

      throw new ApiBugReportError(errorData.meta);
    }

    return response.json();
  }
}
