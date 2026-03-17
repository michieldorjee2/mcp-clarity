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
          "List Microsoft Clarity session recordings with metadata. Supports filtering by date range, device type, browser, OS, country, and user behavior signals.",
        inputSchema: {
          date_start: z
            .string()
            .describe(
              "Start date in ISO 8601 format (e.g. 2026-03-10T00:00:00Z). Required."
            ),
          date_end: z
            .string()
            .describe(
              "End date in ISO 8601 format (e.g. 2026-03-16T23:59:59Z). Required."
            ),
          device_type: z
            .string()
            .optional()
            .describe(
              'Filter by device type: "Desktop", "Mobile", or "Tablet".'
            ),
          browser: z
            .string()
            .optional()
            .describe(
              'Filter by browser name (e.g. "Chrome", "Safari", "Firefox").'
            ),
          os: z
            .string()
            .optional()
            .describe(
              'Filter by operating system (e.g. "Windows", "iOS", "Android").'
            ),
          country: z
            .string()
            .optional()
            .describe('Filter by country name (e.g. "United States").'),
          visited_urls: z
            .string()
            .optional()
            .describe("Filter by URL visited during the session."),
          rage_click_present: z
            .boolean()
            .optional()
            .describe("If true, only return sessions with rage clicks."),
          dead_click_present: z
            .boolean()
            .optional()
            .describe("If true, only return sessions with dead clicks."),
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
            .describe("Number of recordings to return (1-250, default 100)."),
        },
      },
      async (params) => {
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

        const filters: Record<string, unknown> = {
          date: {
            start: params.date_start,
            end: params.date_end,
          },
        };
        if (params.device_type) filters.deviceType = params.device_type;
        if (params.browser) filters.browser = params.browser;
        if (params.os) filters.os = params.os;
        if (params.country) filters.country = params.country;
        if (params.visited_urls) filters.visitedUrls = params.visited_urls;
        if (params.rage_click_present !== undefined)
          filters.rageClickPresent = params.rage_click_present;
        if (params.dead_click_present !== undefined)
          filters.deadClickPresent = params.dead_click_present;

        const data = await clarityFetch(
          `${API_BASE_URL}/recordings/sample`,
          {
            sortBy:
              sortOptionsMap[params.sort_by || "SessionStart_DESC"] ?? 0,
            start: params.date_start,
            end: params.date_end,
            filters,
            count: params.count || 100,
          }
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(data, null, 2) },
          ],
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
