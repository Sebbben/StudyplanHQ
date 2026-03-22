import { NextResponse } from "next/server";

type ErrorResponseOptions = {
  fallbackMessage: string;
  status?: number;
};

export class RouteError extends Error {
  status: number;
  expose: boolean;
  headers?: HeadersInit;

  constructor(message: string, status: number, options?: { expose?: boolean; headers?: HeadersInit }) {
    super(message);
    this.status = status;
    this.expose = options?.expose ?? status < 500;
    this.headers = options?.headers;
  }
}

function mergeHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  nextHeaders.append("Vary", "Cookie");
  return nextHeaders;
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: mergeHeaders(init?.headers),
  });
}

export function noStoreRedirect(url: string | URL, init?: ResponseInit) {
  return NextResponse.redirect(url, {
    ...init,
    headers: mergeHeaders(init?.headers),
  });
}

export function toErrorResponse(error: unknown, options: ErrorResponseOptions) {
  if (error instanceof RouteError) {
    return noStoreJson(
      { error: error.expose ? error.message : options.fallbackMessage },
      { status: error.status, headers: error.headers },
    );
  }

  console.error(error);

  return noStoreJson(
    { error: options.fallbackMessage },
    { status: options.status ?? 500 },
  );
}
