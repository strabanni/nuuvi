import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export async function POST(request: Request) {
  if (!adminClient) {
    return NextResponse.json(
      { error: "Server Supabase configuration is missing." },
      { status: 500 }
    );
  }

  const accessToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const newPassword =
    typeof body === "object" &&
    body !== null &&
    "newPassword" in body &&
    typeof body.newPassword === "string"
      ? body.newPassword
      : "";

  if (newPassword.length < 8 || newPassword.length > 200) {
    return NextResponse.json(
      { error: "Password must be between 8 and 200 characters." },
      { status: 400 }
    );
  }

  const { data: security, error: securityError } = await adminClient
    .from("account_security")
    .select("must_change_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (securityError) {
    console.error("Could not check password reset status:", securityError.message);
    return NextResponse.json(
      { error: "Could not verify password reset status." },
      { status: 500 }
    );
  }

  if (!security?.must_change_password) {
    return NextResponse.json(
      { error: "This account does not require a temporary-password change." },
      { status: 403 }
    );
  }

  const { error: passwordError } = await adminClient.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (passwordError) {
    return NextResponse.json(
      { error: passwordError.message },
      { status: 400 }
    );
  }

  const { error: clearFlagError } = await adminClient
    .from("account_security")
    .update({
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (clearFlagError) {
    console.error("Password changed, but reset flag could not be cleared:", clearFlagError.message);
    return NextResponse.json(
      {
        error:
          "Password changed, but the reset requirement could not be cleared. Please contact an administrator.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}