const API_BASE_URL = "https://url-short-backend-production-f8ad.up.railway.app";

export type Link = {
  code: string;
  originalUrl: string;
  shortUrl: string;
  clickCount: number;
  createdAt: string;
};

export type Analytics = {
  totalClicks: number;
  daily: Array<{ date: string; clicks: number }>;
  referrers: Array<{ name: string; clicks: number }>;
  devices: Array<{ name: string; clicks: number }>;
};

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

export async function createLink(payload: { url: string; alias?: string }) {
  const response = await fetch(`${API_BASE_URL}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return parseResponse<Link>(response);
}

export async function fetchLinks() {
  const response = await fetch(`${API_BASE_URL}/api/links`);
  return parseResponse<{ links: Link[] }>(response);
}

export async function fetchAnalytics(code: string) {
  const response = await fetch(`${API_BASE_URL}/api/links/${code}/analytics`);
  return parseResponse<{ link: Link; analytics: Analytics }>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ApiErrorBody;

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Request failed");
  }

  return body;
}
