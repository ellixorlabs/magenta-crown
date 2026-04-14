import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const email = body.email?.toLowerCase().trim();
    const password = body.password;
    const name = body.name?.trim();

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Valid email and password (8+ characters) required." },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        password: hashed,
        onboardingComplete: true
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
