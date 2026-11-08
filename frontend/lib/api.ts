import axios, { AxiosError } from "axios";
import {
  SiteInput,
  OptimizationResponse,
  WhatsAppDispatchRequest,
  WhatsAppDispatchResponse,
} from "./types";

/**
 * Resolve the backend base API URL cleanly.
 * Handles variations whether NEXT_PUBLIC_API_URL is:
 * - undefined -> defaults to http://localhost:8000/api/v1
 * - "http://localhost:8000" -> appends "/api/v1"
 * - "http://localhost:8000/api/v1" -> keeps as-is
 */
export function getBackendBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const trimmed = envUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export const apiClient = axios.create({
  baseURL: getBackendBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000, // 30s timeout for weather fetch & pvlib 2,160h physics loop
});

export interface ApiErrorDetails {
  title: string;
  message: string;
  fieldErrors?: { field: string; message: string }[];
  isNetworkError: boolean;
  statusCode?: number;
}

/**
 * Extract human-readable error messages from FastAPI / Pydantic v2 responses or network failures.
 */
export function parseApiError(error: unknown): ApiErrorDetails {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<any>;

    // 1. Network / Connection Refused
    if (!axiosErr.response) {
      if (axiosErr.code === "ECONNABORTED") {
        return {
          title: "Simulation Request Timed Out",
          message: "The physics engine took longer than 30 seconds to simulate 90 days. Please retry.",
          isNetworkError: true,
        };
      }
      return {
        title: "FastAPI Backend Unreachable",
        message: `Could not connect to ${getBackendBaseUrl()}. Please verify that the FastAPI backend server is running on port 8000.`,
        isNetworkError: true,
      };
    }

    const status = axiosErr.response.status;
    const data = axiosErr.response.data;

    // 2. Pydantic 422 Unprocessable Entity (Schema Validation Errors)
    if (status === 422 && Array.isArray(data?.detail)) {
      const fieldErrors = data.detail.map((err: any) => {
        const fieldName = Array.isArray(err.loc) ? err.loc.slice(1).join(" → ") : "field";
        return {
          field: fieldName || "input",
          message: err.msg || "Invalid input value",
        };
      });

      return {
        title: "Input Boundary Validation Error",
        message: "One or more plant parameters exceed valid Egyptian physical boundaries.",
        fieldErrors,
        isNetworkError: false,
        statusCode: 422,
      };
    }

    // 3. FastAPI HTTPException (400, 500, etc.)
    if (typeof data?.detail === "string") {
      return {
        title: status === 400 ? "Plant Validation Error" : "Decision Engine Error",
        message: data.detail,
        isNetworkError: false,
        statusCode: status,
      };
    }

    return {
      title: `Server Error (${status})`,
      message: axiosErr.message || "An unexpected error occurred during solar simulation.",
      isNetworkError: false,
      statusCode: status,
    };
  }

  return {
    title: "Unexpected Error",
    message: error instanceof Error ? error.message : String(error),
    isNetworkError: false,
  };
}

/**
 * Health check ping to /api/v1/health
 */
export async function checkBackendHealth(): Promise<{ status: string; version: string }> {
  try {
    const res = await apiClient.get<{ status: string; version: string }>("/health");
    return res.data;
  } catch (err) {
    return { status: "offline", version: "unknown" };
  }
}

/**
 * POST /api/v1/optimize-cleaning
 * Sends SiteInput payload to FastAPI, runs Open-Meteo + pvlib + Kimber + Wilson optimizer.
 */
export async function optimizeCleaningSchedule(site: SiteInput): Promise<OptimizationResponse> {
  const res = await apiClient.post<OptimizationResponse>("/optimize-cleaning", site);
  return res.data;
}

/**
 * POST /api/v1/dispatch/whatsapp
 * Sends automated WhatsApp directive to field engineers.
 */
export async function dispatchWhatsAppDirective(
  payload: WhatsAppDispatchRequest
): Promise<WhatsAppDispatchResponse> {
  const res = await apiClient.post<WhatsAppDispatchResponse>("/dispatch/whatsapp", payload);
  return res.data;
}
