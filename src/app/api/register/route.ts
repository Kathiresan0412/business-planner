import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/db";
import { registerSchema } from "@/lib/validators/auth";
import User from "@/models/User";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check your registration details." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();

    const email = parsed.data.email.toLowerCase();
    const existingUser = await User.exists({ email });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({
      name: parsed.data.name,
      email,
      passwordHash,
    });

    return NextResponse.json(
      { user: { id: String(user._id), name: user.name, email: user.email } },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    console.error("User registration failed:", error);
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 500 });
  }
}
