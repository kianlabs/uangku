import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "./RegisterForm";
import { ApiResponseError } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockRegisterUser = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    registerUser: mockRegisterUser,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RegisterForm", () => {
  it("renders email, password, and confirmation inputs", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/konfirmasi password/i)).toBeTruthy();
  });

  it("shows validation error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/^email$/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    expect(screen.getByText(/format email tidak valid/i)).toBeTruthy();
  });

  it("shows validation error for password shorter than 8 characters", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    expect(screen.getByText(/password minimal 8 karakter/i)).toBeTruthy();
  });

  it("shows validation error when password and confirmation do not match", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/konfirmasi password/i), "password456");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    expect(screen.getByText(/password tidak cocok/i)).toBeTruthy();
  });

  it("shows validation error for missing email", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: /daftar/i }));

    expect(screen.getByText(/email harus diisi/i)).toBeTruthy();
  });

  it("shows validation error for missing password", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    // Password and confirmation both missing — at least one match
    expect(screen.getAllByText(/password harus diisi/i).length).toBeGreaterThan(0);
  });

  it("shows validation error for missing password confirmation", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    expect(screen.getByText(/konfirmasi password harus diisi/i)).toBeTruthy();
  });

  it("maps API field errors to form fields", async () => {
    const user = userEvent.setup();
    mockRegisterUser.mockRejectedValue(
      new ApiResponseError(422, "VALIDATION_ERROR", "Invalid input", {
        email: "Email sudah terdaftar.",
        password: "Password terlalu sederhana.",
      })
    );

    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/konfirmasi password/i), "password123");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    await waitFor(() => {
      expect(screen.getByText(/email sudah terdaftar/i)).toBeTruthy();
      expect(screen.getByText(/password terlalu sederhana/i)).toBeTruthy();
    });
  });

  it("displays server error when no field errors present", async () => {
    const user = userEvent.setup();
    mockRegisterUser.mockRejectedValue(
      new ApiResponseError(500, "INTERNAL_ERROR", "Terjadi kesalahan server.")
    );

    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/konfirmasi password/i), "password123");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    await waitFor(() => {
      expect(screen.getByText(/terjadi kesalahan server/i)).toBeTruthy();
    });
  });

  it("clears field error when user edits after validation failure", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: /daftar/i }));
    expect(screen.getByText(/email harus diisi/i)).toBeTruthy();

    await user.type(screen.getByLabelText(/^email$/i), "test@example.com");
    expect(screen.queryByText(/email harus diisi/i)).toBeNull();
  });
});
