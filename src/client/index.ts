import {
  BugReport,
  BugReportSchema,
  BugReportApiResponse,
  BugReportResponse,
  ApiErrorResponse,
  BugReportFile,
  BugReportFileSchema,
  AppCredentialsSchema,
} from "../types";
import {
  ApiBugReportError,
  AppCredentialTypeError,
  NotFoundBugReportError,
} from "../errors";

export interface BugReportClientOptions {
  apiUrl: string;
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
   * Creates a new instance of the `BugReportClient`.
   *
   * @param options - The client configuration options
   * @throws {Error} If the API URL or app credentials are not provided
   *
   * @example
   * ```ts
   * const client = new BugReportClient({
   *   apiUrl: "https://api.example.com",
   *   appKey: "my-app-key",
   *   appSecret: "my-app-secret"
   * });
   * ```
   */
  constructor(options: BugReportClientOptions) {
    try {
      AppCredentialsSchema.parse({
        appUrl: options.apiUrl,
        appKey: options.appKey,
        appSecret: options.appSecret,
      });
    } catch (error) {
      throw new AppCredentialTypeError(
        `Failed to initialize BugReportClient: ${error}`
      );
    }

    this.apiUrl = options.apiUrl;
    this.headers = {
      "X-App-Key": options.appKey,
      Authorization: `Bearer ${options.appSecret}`,
      ...(options.headers ?? {}),
    };
  }

  /**
   * Submits a bug report to the server.
   *
   * @param report - The bug report data to submit
   * @returns Promise resolving to the server's response
   * @throws {Error} If the bug report data is invalid
   * @throws {ApiBugReportError} If the server responds with an error
   *
   * @example
   * ```ts
   * const report = {
   *   title: "Bug Title",
   *   description: "Bug Description"
   *   severity: "high",
   *   tags: ["ui", "critical"],
   *   file: ["base64Image1", "base64Image2"],
   *   createdAt: new Date() // Optional
   * };
   *
   * await client.submitBugReport(report);
   * ```
   */
  async submitBugReport(report: BugReport): Promise<BugReportResponse> {
    try {
      BugReportSchema.parse(report);
    } catch (error) {
      throw new Error(`Invalid bug report data: ${error}`);
    }

    const response = await fetch(`${this.apiUrl}/api/bugs/reports`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
      },
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
   * Submits a bug report to the server with progress tracking.
   *
   * @param report - The bug report data to submit
   * @param onProgress - Callback function that receives upload progress (0-100)
   * @returns Promise resolving to the server's response
   * @throws {Error} If the bug report data is invalid
   * @throws {ApiBugReportError} If the server responds with an error
   *
   * @example
   * ```ts
   * const report = {
   *   title: "Bug Title",
   *   description: "Bug Description"
   *   severity: "high",
   *   tags: ["ui", "critical"],
   *   file: [base64Image1, base64Image2],
   *   createdAt: new Date() // Optional
   * };
   *
   * await client.submitBugReportWithProgress(
   *   report,
   *   (progress) => console.log(`Upload progress: ${progress}%`)
   * );
   * ```
   */
  async submitBugReportWithProgress(
    report: BugReport,
    onProgress: (progress: number) => void
  ): Promise<BugReportResponse> {
    try {
      BugReportSchema.parse(report);
    } catch (error) {
      throw new Error(`Invalid bug report data: ${error}`);
    }

    const body = JSON.stringify({
      ...report,
      createdAt: report.createdAt ?? new Date(),
    });

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error("Failed to parse server response"));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText) as ApiErrorResponse;
            reject(new ApiBugReportError(errorData.meta));
          } catch (error) {
            reject(new Error(`Server returned status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network request failed"));
      };

      xhr.open("POST", `${this.apiUrl}/api/bugs/reports`);

      // Add headers
      Object.entries({
        ...this.headers,
        "Content-Type": "application/json",
      }).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(body);
    });
  }

  /**
   * Submits a bug report with associated file attachments to the API.
   *
   * @param report - The bug report data including title, description, severity, tags and file files
   * @throws {Error} If the bug report data is invalid according to BugReportSchema
   * @throws {ApiBugReportError} If the API request fails
   * @returns {Promise<BugReportResponse>} A promise that resolves with the API response
   *
   * @example
   * ```typescript
   * const bugReport = {
   *   title: "Bug Title",
   *   description: "Bug Description",
   *   severity: "high",
   *   tags: ["frontend", "ui"],
   *   file: [file1, file2],
   *   createdAt: new Date() // Optional
   * };
   * const response = await client.submitBugReportWithFile(bugReport);
   * ```
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

    const response = await fetch(`${this.apiUrl}/api/bugs/reports`, {
      method: "POST",
      headers: {
        ...this.headers,
      },
      body: formData,
    });

    if (!response.ok) {
      const data = (await response.json()) as ApiErrorResponse;
      throw new ApiBugReportError(data.meta);
    }

    return response.json();
  }

  /**
   * Submits a bug report with file attachments and provides upload progress feedback.
   *
   * @param report - The bug report data including files to be uploaded
   * @param onProgress - Callback function that receives the upload progress percentage
   * @returns Promise that resolves with the bug report response from the server
   *
   * @throws {Error} If the bug report data is invalid according to BugReportFileSchema
   * @throws {ApiBugReportError} If the server returns an error response
   * @throws {Error} If network error occurs or if server returns unexpected error format
   *
   * @example
   * ```typescript
   * const report = {
   *   title: "Bug Title",
   *   description: "Bug Description",
   *   severity: "high",
   *   tags: ["ui", "critical"],
   *   file: [file1, file2], // File objects
   *   createdAt: new Date() // Optional
   * };
   *
   * client.submitBugReportWithFileProgress(
   *   report,
   *   (progress) => console.log(`Upload progress: ${progress}%`)
   * );
   * ```
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

    // Calculate total size of files
    let totalSize = 0;
    report.file.forEach((file) => {
      totalSize += file.size;
      formData.append("file", file);
    });

    // Create XMLHttpRequest to track upload progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

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

      xhr.open("POST", `${this.apiUrl}/api/bugs/reports`);

      // Add headers
      Object.entries(this.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  }

  /**
   * Retrieves a specific bug report by its ID from the API.
   *
   * @param id - The unique identifier of the bug report to retrieve
   * @returns Promise containing the bug report response data
   * @throws {NotFoundBugReportError} When the bug report is not found (404)
   * @throws {ApiBugReportError} When any other API error occurs
   *
   * @example
   * ```typescript
   * const bugReport = await client.getBugReport("123");
   * ```
   */
  async getBugReport(id: string): Promise<BugReportApiResponse> {
    const response = await fetch(`${this.apiUrl}/api/bugs/${id}`, {
      method: "GET",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse;

      if (response.status === 404) {
        throw new NotFoundBugReportError(errorData.meta);
      }

      throw new ApiBugReportError(errorData.meta);
    }

    return response.json() as Promise<BugReportApiResponse>;
  }

  /**
   * Retrieves a list of bug reports from the API.
   *
   * @returns Promise containing the list of bug reports
   * @throws {ApiBugReportError} When an API error occurs
   *
   * @example
   * ```typescript
   * const bugReports = await client.getBugReports();
   * ```
   */
  async getBugTags(): Promise<string[]> {
    const response = await fetch(`${this.apiUrl}/api/bugs/tags`, {
      method: "GET",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse;
      throw new ApiBugReportError(errorData.meta);
    }

    const data = (await response.json()) as string[];
    return data;
  }
}
