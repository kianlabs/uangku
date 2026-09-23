import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";

const mockPush = vi.fn();
let mockPathname = "/beranda";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockGetMe = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();
vi.mock("@/lib/auth", () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  login: (...args: unknown[]) => mockLogin(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
  register: vi.fn(),
}));

// Mock preferences — getPreferences fire-and-forget, tidak boleh throw
vi.mock("@/lib/preferences", () => ({
  getPreferences: vi.fn().mockResolvedValue({ payday: null, tx_sources: null, debt_tags: null, templates: null }),
}));

// Mock seedLocalStorageFromPreferences — tidak perlu benar-benar seed di unit test
vi.mock("@/lib/local-storage", () => ({
  seedLocalStorageFromPreferences: vi.fn(),
  clearLocalCache: vi.fn(),
}));

function AuthProbe() {
  const { user, isAuthenticated, loginUser, logoutUser } = useAuth();
  return (
    <div>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <button onClick={() => loginUser("test@example.com", "password123")}>login</button>
      <button onClick={() => logoutUser()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthContext", () => {
  it("loads current user via getMe on mount", async () => {
    mockGetMe.mockResolvedValue({
      id: "1",
      email: "loaded@example.com",
      created_at: "2024-01-01",
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    // Loading state shows spinner, children not rendered
    // Wait for getMe to resolve and children to render
    await waitFor(() => {
      expect(screen.getByTestId("email")).toBeTruthy();
    });

    expect(screen.getByTestId("email").textContent).toBe("loaded@example.com");
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
  });

  it("sets user after login and flips isAuthenticated", async () => {
    mockGetMe.mockRejectedValue(new Error("not logged in"));
    mockLogin.mockResolvedValue({
      id: "2",
      email: "new@example.com",
      created_at: "2024-01-01",
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    // Wait for initial getMe to fail and probe to render
    await waitFor(() => {
      expect(screen.getByTestId("email")).toBeTruthy();
    });

    expect(screen.getByTestId("email").textContent).toBe("none");
    expect(screen.getByTestId("authenticated").textContent).toBe("false");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("new@example.com");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("true");
  });

  it("clears user and redirects after logout", async () => {
    mockGetMe.mockResolvedValue({
      id: "1",
      email: "existing@example.com",
      created_at: "2024-01-01",
    });
    mockLogout.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("existing@example.com");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("true");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("none");
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/masuk");
  });

  it("resets initialized ref on logout allowing fresh getMe on subsequent session", async () => {
    mockPathname = "/beranda";
    mockGetMe.mockResolvedValueOnce({
      id: "1",
      email: "user1@example.com",
      created_at: "2024-01-01",
    });
    mockLogout.mockResolvedValue(undefined);

    const { rerender } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("user1@example.com");
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("none");
    });

    mockGetMe.mockResolvedValueOnce({
      id: "2",
      email: "user2@example.com",
      created_at: "2024-01-02",
    });

    // Simulasi user diarahkan ke /masuk lalu kembali ke protected page /beranda
    mockPathname = "/masuk";
    rerender(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    mockPathname = "/beranda";
    rerender(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("email").textContent).toBe("user2@example.com");
    });
  });
});
