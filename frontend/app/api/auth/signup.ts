import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Simple in-memory user store (same as in [...nextauth]/route.ts)
const users: Record<string, { email: string; password: string; name: string }> = {};

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, confirmPassword } = await req.json();

    // Validation
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (users[email]) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const fullName = `${firstName} ${lastName}`.trim();
    users[email] = {
      email,
      password: hashedPassword,
      name: fullName,
    };

    return NextResponse.json(
      { success: true, message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
