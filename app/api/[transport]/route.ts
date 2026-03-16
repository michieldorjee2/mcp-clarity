import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const API_BASE_URL = "https://clarity.microsoft.com/mcp";

async function clarityFetch(url: string, body: object): Promise<unknown> {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) {
    return {
      error:
        "No Clarity API token configured. Set the CLARITY_API_TOKEN environment variable.",
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Clarity API request failed: ${response.status}`);
  }

  return await response.json();
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "query_analytics_dashboard",
      {
        title: "Query Analytics Dashboard",
        description:
          'Fetch Microsoft Clarity analytics data using a natural language search query. Queries should be focused on one specific metric with an explicit time range. Examples: "Page views count for the last 7 days", "Top browsers last 3 days", "Average session duration for desktop users this week".',
        inputSchema: {
          query: z
            .string()
            .describe(
              "A natural language search query for analytics data. Be specific and include a time range."
            ),
          timezone: z
            .string()
            .optional()
            .describe(
              'IANA timezone string (e.g., "America/New_York"). Defaults to UTC.'
            ),
        },
      },
      async ({ query, timezone }) => {
        const data = await clarityFetch(`${API_BASE_URL}/dashboard/query`, {
          query,
          timezone: timezone || "UTC",
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      }
    );

    server.registerTool(
      "list_session_recordings",
      {
        title: "List Session Recordings",
        description:
          "List Microsoft Clarity session recordings with metadata. Supports filtering by date range, device type, browser, OS, country, URLs visited, smart events, user behavior (dead clicks, rage clicks), web vitals, and more. The filters object must include a date field with start and end in ISO 8601 format.",
        inputSchema: {
          filters: z
            .record(z.unknown())
            .describe(
              "Filter object with fields: date (required, {start, end} in ISO 8601), deviceType, browser, os, country, city, visitedUrls, entryUrls, exitUrls, smartEvents, userType, sessionIntent, deadClickPresent, rageClickPresent, scrollDepth, sessionDuration, and more."
            ),
          sort_by: z
            .enum([
              "SessionStart_DESC",
              "SessionStart_ASC",
              "SessionDuration_ASC",
              "SessionDuration_DESC",
              "SessionClickCount_ASC",
              "SessionClickCount_DESC",
              "PageCount_ASC",
              "PageCount_DESC",
            ])
            .optional()
            .describe("Sort option. Defaults to SessionStart_DESC."),
          count: z
            .number()
            .int()
            .min(1)
            .max(250)
            .optional()
            .describe("Number of recordings to return (1-250, default 100)"),
        },
      },
      async ({ filters, sort_by, count }) => {
        const sortOptionsMap: Record<string, number> = {
          SessionStart_DESC: 0,
          SessionStart_ASC: 1,
          SessionDuration_ASC: 2,
          SessionDuration_DESC: 3,
          SessionClickCount_ASC: 4,
          SessionClickCount_DESC: 5,
          PageCount_ASC: 6,
          PageCount_DESC: 7,
        };

        const now = new Date().toISOString();
        const dateFilter = filters.date as
          | { start?: string; end?: string }
          | undefined;
        const endDate = new Date(dateFilter?.end || now);
        const startDate = new Date(dateFilter?.start || now);

        if (!dateFilter?.start) {
          startDate.setDate(endDate.getDate() - 2);
        }

        const data = await clarityFetch(
          `${API_BASE_URL}/recordings/sample`,
          {
            sortBy: sortOptionsMap[sort_by || "SessionStart_DESC"] ?? 0,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            filters,
            count: count || 100,
          }
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      }
    );

    server.registerTool(
      "query_documentation",
      {
        title: "Query Documentation",
        description:
          "Search Microsoft Clarity documentation for answers about setup, features, usage, troubleshooting, and integrations. Covers getting started, mobile SDKs, dashboard, session recordings, heatmaps, filters, settings, Copilot, API reference, and more.",
        inputSchema: {
          query: z
            .string()
            .describe(
              'A natural language query about Clarity documentation (e.g., "How to set up Clarity on Shopify", "What are smart events")'
            ),
        },
      },
      async ({ query }) => {
        const data = await clarityFetch(
          `${API_BASE_URL}/documentation/query`,
          { query }
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      }
    );
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
