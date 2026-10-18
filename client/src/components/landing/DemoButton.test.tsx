import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoButton } from "./DemoButton";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockLoginDemoUser = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    loginDemoUser: mockLoginDemoUser,
  }),
}));

vi.mock("@/lib/toast", () => ({
  showToast: vi.fn(),
}));

vi.mock("@/lib/haptics", () => ({
  haptic: {
    tap: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DemoButton", () => {
  it("renders correctly with default hero label", () => {
    render(<DemoButton />);
    expect(screen.getByRole("button", { name: /coba demo instan/i })).toBeTruthy();
  });

  it("renders correctly with nav variant", () => {
    render(<DemoButton variant="nav" />);
    expect(screen.getByRole("button", { name: /coba demo/i })).toBeTruthy();
  });

  it("handles demo login and redirects to /dashboard", async () => {
    mockLoginDemoUser.mockResolvedValueOnce(undefined);
    render(<DemoButton />);

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /coba demo instan/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockLoginDemoUser).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("handles error during demo login", async () => {
    mockLoginDemoUser.mockRejectedValueOnce(new Error("Login failed"));
    render(<DemoButton />);

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /coba demo instan/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockLoginDemoUser).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
