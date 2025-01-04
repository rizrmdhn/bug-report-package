import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BugReportClient } from "../client";
import {
  ApiResponse,
  BugReport,
  BugReportResponse,
  BugSeverity,
} from "../types";
import fetch from "cross-fetch";

vi.mock("cross-fetch", () => ({
  default: vi.fn(),
}));

describe("BugReportClient", () => {
  let client: BugReportClient;
  const mockCredentials = {
    apiUrl: "https://api.test.com",
    appName: "TestApp",
    appKey: "test-key",
    appSecret: "test-secret",
  };

  const mockBugReport = {
    title: "Test Bug",
    description: "This is a test bug report",
    severity: BugSeverity.HIGH,
    tags: ["UI", "FUNCTIONALITY"],
    image: ["base64-encoded-image"],
    metadata: {
      browser: "Chrome",
      version: "1.0.0",
    },
  } satisfies BugReport;

  beforeEach(() => {
    client = new BugReportClient(mockCredentials);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should submit bug report", async () => {
    const mockResponse = {
      meta: {
        code: 200,
        status: "success",
        message: "Bug report submitted",
      },
      data: {
        id: "123",
        status: "SUBMITTED",
        createdAt: new Date().toISOString(),
      },
    } satisfies ApiResponse<BugReportResponse>;

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const response = await client.submitBugReport(mockBugReport);

    expect(response).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith("https://api.test.com/bugs/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Name": mockCredentials.appName,
        "X-App-Key": mockCredentials.appKey,
        Authorization: `Bearer ${mockCredentials.appSecret}`,
      },
      body: expect.any(String),
    });

    // Verify the bug report data in the request body
    const requestBody = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]!.body as string
    );
    expect(requestBody).toMatchObject(mockBugReport);
  });

  it("should throw error if credentials are not provided", () => {
    expect(
      () =>
        new BugReportClient({
          apiUrl: "https://api.test.com",
          appName: "",
          appKey: "test",
          appSecret: "test",
        })
    ).toThrow("App credentials");

    expect(
      () =>
        new BugReportClient({
          apiUrl: "https://api.test.com",
          appName: "test",
          appKey: "",
          appSecret: "test",
        })
    ).toThrow("App credentials");

    expect(
      () =>
        new BugReportClient({
          apiUrl: "https://api.test.com",
          appName: "test",
          appKey: "test",
          appSecret: "",
        })
    ).toThrow("App credentials");
  });

  it("should get bug report with correct headers", async () => {
    const mockResponse = {
      meta: {
        code: 200,
        status: "success",
        message: "Bug report submitted",
      },
      data: {
        id: "123",
        status: "SUBMITTED",
        createdAt: new Date().toISOString(),
      },
    } satisfies ApiResponse<BugReportResponse>;

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const response = await client.getBugReport("123");

    expect(response).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith("https://api.test.com/bugs/123", {
      headers: {
        "Content-Type": "application/json",
        "X-App-Name": mockCredentials.appName,
        "X-App-Key": mockCredentials.appKey,
        Authorization: `Bearer ${mockCredentials.appSecret}`,
      },
      method: "GET",
    });

    // Test error case
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({
        meta: {
          code: 500,
          status: "error",
          message: "Internal Server Error",
        },
      }),
    } as unknown as Response);

    await expect(client.getBugReport("123")).rejects.toThrow(
      "API Error [500]: Internal Server Error"
    );
  });

  it("should get bug tags", async () => {
    const mockResponse = {
      meta: {
        code: 200,
        status: "success",
        message: "List of available bug tags",
      },
      data: {
        tags: ["UI", "FUNCTIONALITY", "PERFORMANCE"],
      },
    } satisfies ApiResponse<{ tags: string[] }>;

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const response = await client.getBugTags();

    expect(response).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith("https://api.test.com/bugs/tags", {
      headers: {
        "Content-Type": "application/json",
        "X-App-Name": mockCredentials.appName,
        "X-App-Key": mockCredentials.appKey,
        Authorization: `Bearer ${mockCredentials.appSecret}`,
      },
      method: "GET",
    });
  });

  it("should handle failed bug report fetch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({
        meta: {
          code: 404,
          status: "error",
          message: "Bug report not found",
        },
      }),
    } as Response);

    await expect(client.getBugReport("123")).rejects.toThrow(
      "Not Found Error [404]: Bug report not found"
    );
  });

  it("should allow additional custom headers", async () => {
    const clientWithCustomHeaders = new BugReportClient({
      ...mockCredentials,
      headers: {
        "X-Custom-Header": "custom-value",
      },
    });

    const mockResponse = {
      id: "123",
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
    };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    await clientWithCustomHeaders.getBugReport("123");

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-App-Name": mockCredentials.appName,
          "X-App-Key": mockCredentials.appKey,
          Authorization: `Bearer ${mockCredentials.appSecret}`,
          "X-Custom-Header": "custom-value",
        }),
      })
    );
  });

  it("should validate bug report data", async () => {
    const invalidBugReport = {
      // Missing required fields
      title: "",
      description: "",
      severity: "INVALID",
    };

    await expect(
      client.submitBugReport(invalidBugReport as any)
    ).rejects.toThrow("Invalid bug report data");
  });
});
