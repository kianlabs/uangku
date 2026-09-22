function normalizeFields(fields: unknown): Record<string, string> | undefined {
  if (Array.isArray(fields)) {
    const normalized: Record<string, string> = {};
    for (const item of fields) {
      if (
        item &&
        typeof item === "object" &&
        "field" in item &&
        "message" in item &&
        typeof item.field === "string" &&
        typeof item.message === "string"
      ) {
        normalized[item.field] = normalized[item.field]
          ? `${normalized[item.field]} ${item.message}`
          : item.message;
      }
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  if (fields && typeof fields === "object") {
    return fields as Record<string, string>;
  }

  return undefined;
}

export class ApiResponseError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const API_TIMEOUT_MS = 15_000;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Selalu relative URL — Next.js rewrite proxy ke server (dev & production)
  const { signal: userSignal, ...rest } = options;

  // Batas waktu agar loading tak muter selamanya; signal pemanggil digabung.
  const controller = new AbortController();
  const timeoutError = new DOMException(
    "Server terlalu lama merespons.",
    "TimeoutError"
  );
  const timeoutId = setTimeout(
    () => controller.abort(timeoutError),
    API_TIMEOUT_MS
  );
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      userSignal.addEventListener(
        "abort",
        () => controller.abort(userSignal.reason),
        { once: true }
      );
    }
  }

  let response: Response;

  try {
    // Content-Type JSON hanya bila ada body (hindari preflight).
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
    if (rest.body != null && !("Content-Type" in headers) && !("content-type" in headers)) {
      headers["Content-Type"] = "application/json";
    }
    response = await fetch(path, {
      ...rest,
      credentials: "include",
      signal: controller.signal,
      headers,
    });
  } catch (err) {
    if (
      err === timeoutError ||
      (err instanceof DOMException && err.name === "TimeoutError")
    ) {
      throw new ApiResponseError(
        0,
        "TIMEOUT_ERROR",
        "Server terlalu lama merespons. Coba lagi."
      );
    }
    throw new ApiResponseError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi."
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("uangku:unauthorized"));
    }

    const err = data?.error ?? data?.detail ?? {};
    throw new ApiResponseError(
      response.status,
      err.code ?? "UNKNOWN_ERROR",
      err.message ?? "Terjadi kesalahan. Coba lagi.",
      normalizeFields(err.fields)
    );
  }

  return data as T;
}
