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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Selalu relative URL — Next.js rewrite proxy ke backend (dev & production)
  let response: Response;

  try {
    response = await fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiResponseError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi."
    );
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
