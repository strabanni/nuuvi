import "server-only";

import { randomBytes } from "node:crypto";
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminClient) {
    return NextResponse.json(
      { error: "Server Supabase configuration is missing." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Validate the caller's Supabase session.
  const {
    data: { user: actor },
    error: authError,
  } = await adminClient.auth.getUser(accessToken);

  if (authError || !actor) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  // Check admin privileges on the server. Never trust a client-side role check.
  const { data: actorProfile, error: actorProfileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .single();

  if (actorProfileError || actorProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { id: targetId } = await params;

  if (targetId === actor.id) {
    return NextResponse.json(
      { error: "Use the normal password-change flow to reset your own password." },
      { status: 400 }
    );
  }

  const {
    data: { user: target },
    error: targetError,
  } = await adminClient.auth.admin.getUserById(targetId);

  if (targetError || !target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Return this once to the admin. Do not log or persist the temporary password.
  const temporaryPassword = randomBytes(24).toString("base64url");

  const { error: passwordError } = await adminClient.auth.admin.updateUserById(
    targetId,
    { password: temporaryPassword }
  );

  if (passwordError) {
    return NextResponse.json(
      { error: "Could not reset the password." },
      { status: 500 }
    );
  }

  const { error: securityError } = await adminClient
    .from("account_security")
    .upsert(
      {
        user_id: targetId,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (securityError) {
    console.error("Password reset flag update failed:", securityError.message);
    return NextResponse.json(
      {
        error:
          "The password was reset, but the password-change requirement could not be saved. Contact an administrator before sharing the temporary password.",
      },
      { status: 500 }
    );
  }

  const { error: auditError } = await adminClient
    .from("admin_password_reset_audit")
    .insert({ actor_id: actor.id, target_id: targetId });

  if (auditError) {
    console.error("Password reset audit insert failed:", auditError.message);
    return NextResponse.json(
      {
        error:
          "The password was reset and the change requirement was saved, but the audit entry failed. Contact an administrator before sharing the temporary password.",
      },
      { status: 500 }
    );
  }

  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("username")
    .eq("id", targetId)
    .maybeSingle();

  return NextResponse.json({
    username: targetProfile?.username ?? target.email ?? "user",
    temporaryPassword,
  });
}