import {
  BugReport,
  BugReportSchema,
  BugReportApiResponse,
  BugReportResponse,
  ApiErrorResponse,
  BugReportFile,
  BugReportFileSchema,
} from "../types";
import { ApiBugReportError, NotFoundBugReportError } from "../errors";

export interface BugReportClientOptions {
  apiUrl: string;
  appKey: string;
  appSecret: string;
  headers?: Record<string, string>;
}

/**
 * The `BugReportClient` class provides methods to interact with the bug report API.
 * Updated for Next.js 15 compatibility with proper CORS handling.
 */
export class BugReportClient {
  private apiUrl: string;
  private headers: Record<string, string>;
  private defaultFetchOptions: RequestInit;

  constructor(options: BugReportClientOptions) {
    if (!options.apiUrl) {
      throw new Error("API URL is required");
    }

    if (!options.appKey || !options.appSecret) {
      throw new Error("App credentials (App Key, App Secret) are required");
    }

    this.apiUrl = options.apiUrl;
    this.headers = {
      "Content-Type": "application/json",
      "X-App-Key": options.appKey,
      Authorization: `Bearer ${options.appSecret}`,
      ...(options.headers ?? {}),
    };

    // Default fetch options for all requests
    this.defaultFetchOptions = {
      credentials: "include", // Include credentials for cross-origin requests
      mode: "cors", // Explicitly enable CORS
      headers: this.headers,
    };
  }

  /**
   * Helper method to handle API responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse;

      if (response.status === 404) {
        throw new NotFoundBugReportError(errorData.meta);
      }

      throw new ApiBugReportError(errorData.meta);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Submits a bug report using the Fetch API with proper CORS handling
   */
  async submitBugReport(report: BugReport): Promise<BugReportResponse> {
    try {
      BugReportSchema.parse(report);
    } catch (error) {
      throw new Error(`Invalid bug report data: ${error}`);
    }

    const response = await fetch(`${this.apiUrl}/bugs/reports`, {
      ...this.defaultFetchOptions,
      method: "POST",
      body: JSON.stringify({
        ...report,
        createdAt: report.createdAt ?? new Date(),
      }),
    });

    return this.handleResponse<BugReportResponse>(response);
  }

  /**
   * Submits a bug report with file attachments using FormData
   */
  async submitBugReportWithFile(
    report: BugReportFile
  ): Promise<BugReportResponse> {
    try {
      BugReportFileSchema.parse(report);
    } catch (error) {
      throw new Error(`Invalid bug report data: ${error}`);
    }

    const formData = new FormData();
    formData.append("title", report.title);
    formData.append("description", report.description);
    formData.append("severity", report.severity);
    formData.append("tags", JSON.stringify(report.tags));
    report.file.forEach((file) => {
      formData.append("file", file);
    });

    // Remove Content-Type header for FormData requests
    const { "Content-Type": _, ...headers } = this.headers;

    const response = await fetch(`${this.apiUrl}/bugs/reports`, {
      ...this.defaultFetchOptions,
      method: "POST",
      headers,
      body: formData,
    });

    return this.handleResponse<BugReportResponse>(response);
  }

  /**
   * Submit bug report with upload progress using XMLHttpRequest
   * Modified to work with CORS in Next.js 15
   */
  async submitBugReportWithFileProgress(
    report: BugReportFile,
    onProgress: (progress: number) => void
  ): Promise<BugReportResponse> {
    try {
      BugReportFileSchema.parse(report);
    } catch (error) {
      throw new Error(`Invalid bug report data: ${error}`);
    }

    const formData = new FormData();
    formData.append("title", report.title);
    formData.append("description", report.description);
    formData.append("severity", report.severity);
    formData.append("tags", JSON.stringify(report.tags));
    report.file.forEach((file) => {
      formData.append("file", file);
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.withCredentials = true; // Enable credentials for CORS

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.response));
        } else {
          try {
            const errorData = JSON.parse(xhr.response) as ApiErrorResponse;
            reject(new ApiBugReportError(errorData.meta));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error occurred"));
      });

      xhr.open("POST", `${this.apiUrl}/bugs/reports`);

      // Add headers except Content-Type (let browser set it for FormData)
      Object.entries(this.headers).forEach(([key, value]) => {
        if (key !== "Content-Type") {
          xhr.setRequestHeader(key, value);
        }
      });

      xhr.send(formData);
    });
  }

  /**
   * Get a specific bug report
   */
  async getBugReport(id: string): Promise<BugReportApiResponse> {
    const response = await fetch(`${this.apiUrl}/bugs/${id}`, {
      ...this.defaultFetchOptions,
      method: "GET",
    });

    return this.handleResponse<BugReportApiResponse>(response);
  }

  /**
   * Get bug report tags
   */
  async getBugTags(): Promise<BugReportApiResponse> {
    const response = await fetch(`${this.apiUrl}/bugs/tags`, {
      ...this.defaultFetchOptions,
      method: "GET",
    });

    return this.handleResponse<BugReportApiResponse>(response);
  }
}
