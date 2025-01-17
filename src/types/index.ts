import { z } from "zod";

export enum BugSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export const BugTagSchema = z.enum([
  "UI",
  "FUNCTIONALITY",
  "PERFORMANCE",
  "SECURITY",
  "CRASH",
  "NETWORK",
  "DATABASE",
  "OTHER",
]);

export type BugTag = z.infer<typeof BugTagSchema>;

export const BugReportSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  severity: z.nativeEnum(BugSeverity),
  tags: z.array(BugTagSchema),
  file: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
});

export const BugReportFileSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  severity: z.nativeEnum(BugSeverity),
  tags: z.array(BugTagSchema),
  file: z.array(
    z
      .instanceof(File)
      .refine((file) =>
        ["image/png", "image/jpeg", "image/jpg", ,].includes(file.type)
      ),
    {
      message:
        "Invalid file type supplied. Only PNG, JPEG, and JPG are allowed.",
    }
  ),
  createdAt: z.date().optional(),
});

export type BugReport = z.infer<typeof BugReportSchema>;

export type BugReportFile = z.infer<typeof BugReportFileSchema>;

export const AppCredentialsSchema = z.object({
  appUrl: z.string().url(),
  appKey: z.string().min(5),
  appSecret: z.string().min(5),
});

export interface ApiResponse<T> {
  meta: {
    code: number;
    status: "success" | "error";
    message: string;
  };
  data: T;
}

export interface ApiErrorResponse {
  meta: {
    code: number;
    status: "error";
    message: string;
  };
}

export interface BugReportResponse {
  id: string;
  status: "SUBMITTED" | "PROCESSING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export type BugReportApiResponse = ApiResponse<BugReportResponse[]>;
