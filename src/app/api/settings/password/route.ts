import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { passwordChangeSchema } from "@/lib/validators/settings";
import User from "@/models/User";

export async function POST(request: Request) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid password change." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(sessionUser.id).select("passwordHash").exec();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password update failed:", error);
    return NextResponse.json({ error: "Could not change your password." }, { status: 500 });
  }
}
