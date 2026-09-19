import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";
import { ApiResponseError } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

const mockLoginUser = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    loginUser: mockLoginUser,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginForm", () => {
  it("renders email and password inputs", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it("shows validation error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "invalid-email");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    expect(screen.getByText(/format email tidak valid/i)).toBeTruthy();
  });

  it("shows validation error for missing password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    expect(screen.getByText(/password harus diisi/i)).toBeTruthy();
  });

  it("shows validation error for missing email", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    expect(screen.getByText(/email harus diisi/i)).toBeTruthy();
  });

  it("maps API field errors to form fields", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockRejectedValue(
      new ApiResponseError(422, "VALIDATION_ERROR", "Invalid credentials", {
        email: "Email tidak terdaftar.",
        password: "Password salah.",
      })
    );

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => {
      expect(screen.getByText(/email tidak terdaftar/i)).toBeTruthy();
      expect(screen.getByText(/password salah/i)).toBeTruthy();
    });
  });

  it("displays server error when no field errors", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockRejectedValue(
      new ApiResponseError(401, "UNAUTHORIZED", "Akun tidak valid.")
    );

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => {
      expect(screen.getByText(/akun tidak valid/i)).toBeTruthy();
    });
  });

  it("clears field error when user edits after validation failure", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /masuk/i }));
    expect(screen.getByText(/email harus diisi/i)).toBeTruthy();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    expect(screen.queryByText(/email harus diisi/i)).toBeNull();
  });
});
