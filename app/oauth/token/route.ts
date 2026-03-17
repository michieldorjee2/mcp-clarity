export async function POST() {
  return new Response(
    JSON.stringify({
      access_token: "clarity-mcp-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "clarity-mcp-refresh-token",
      scope: "mcp",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
