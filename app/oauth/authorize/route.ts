import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  if (!redirectUri) {
    return NextResponse.json(
      { error: "missing redirect_uri" },
      { status: 400 }
    );
  }

  const url = new URL(redirectUri);
  url.searchParams.set("code", "clarity-mcp-auth-code");
  if (state) {
    url.searchParams.set("state", state);
  }

  return NextResponse.redirect(url.toString());
}
