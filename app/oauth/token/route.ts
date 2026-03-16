import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    access_token: "clarity-mcp-access-token",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "clarity-mcp-refresh-token",
    scope: "mcp",
  });
}
