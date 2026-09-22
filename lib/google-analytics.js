import fs from "fs/promises";
import path from "path";
import { google } from "googleapis";

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function rangeDates(days, offset = 0) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2 - offset);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { startDate: dateString(start), endDate: dateString(end) };
}

async function authClient() {
  const configured = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!configured)
    throw new Error(
      "Google APIs are not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  const filename = path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
  let credentials;
  try {
    credentials = JSON.parse(await fs.readFile(filename, "utf8"));
  } catch (error) {
    throw new Error(
      "Unable to read GOOGLE_SERVICE_ACCOUNT_JSON: " + error.message,
    );
  }
  if (!credentials.client_email || !credentials.private_key)
    throw new Error("Google service-account JSON is invalid");
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
  });
}

function number(value) {
  return Number(value || 0);
}

async function gaReport(analytics, property, dates) {
  const response = await analytics.properties.runReport({
    property: "properties/" + property,
    requestBody: {
      dateRanges: [dates],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "userEngagementDuration" },
        { name: "conversions" },
        { name: "totalUsers" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "sessionDefaultChannelGroup",
          stringFilter: { matchType: "EXACT", value: "Organic Search" },
        },
      },
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
  });
  return (response.data.rows || []).map((row) => ({
    date: row.dimensionValues?.[0]?.value,
    organic: number(row.metricValues?.[0]?.value),
    views: number(row.metricValues?.[1]?.value),
    engagement: number(row.metricValues?.[2]?.value),
    conversions: number(row.metricValues?.[3]?.value),
    unique: number(row.metricValues?.[4]?.value),
  }));
}

async function gscQuery(search, siteUrl, dates, dimensions, rowLimit = 25000) {
  const response = await search.searchanalytics.query({
    siteUrl,
    requestBody: { ...dates, dimensions, rowLimit, dataState: "final" },
  });
  return response.data.rows || [];
}

function gscDateRows(rows) {
  return rows.map((row) => ({
    date: row.keys?.[0],
    clicks: number(row.clicks),
    impressions: number(row.impressions),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  }));
}

function totals(rows) {
  return {
    organic: rows.reduce((sum, row) => sum + row.organic, 0),
    views: rows.reduce((sum, row) => sum + row.views, 0),
    unique: rows.reduce((sum, row) => sum + (row.unique || 0), 0),
    engagement: rows.length
      ? Math.round(
          rows.reduce((sum, row) => sum + row.engagement, 0) / rows.length,
        )
      : 0,
    conversions: rows.reduce((sum, row) => sum + row.conversions, 0),
    impressions: rows.reduce((sum, row) => sum + row.impressions, 0),
    clicks: rows.reduce((sum, row) => sum + row.clicks, 0),
    avgPosition: rows.length
      ? Number(
          (
            rows.reduce((sum, row) => sum + row.position, 0) /
            (rows.filter((row) => row.position).length || 1)
          ).toFixed(1),
        )
      : 0,
  };
}

function pct(current, previous) {
  return previous
    ? Number((((current - previous) / previous) * 100).toFixed(1))
    : current
      ? 100
      : 0;
}

async function gaPageReport(analytics, property, dates) {
  try {
    const response = await analytics.properties.runReport({
      property: "properties/" + property,
      requestBody: {
        dateRanges: [dates],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 50,
      },
    });
    return (response.data.rows || []).map((row) => ({
      path: row.dimensionValues?.[0]?.value || "",
      views: number(row.metricValues?.[0]?.value),
    }));
  } catch (error) {
    return [];
  }
}

export async function getGoogleAnalytics(days) {
  const property = process.env.GA4_PROPERTY_ID?.trim();
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!property || !siteUrl)
    throw new Error(
      "Set GA4_PROPERTY_ID and GSC_SITE_URL before using Google analytics",
    );
  const auth = await authClient();
  const ga = google.analyticsdata({ version: "v1beta", auth });
  const search = google.searchconsole({ version: "v1", auth });
  const currentDates = rangeDates(days);
  const previousDates = rangeDates(days, days);
  const [
    gaCurrent,
    gaPrevious,
    gscCurrent,
    gscPrevious,
    queryRows,
    pageRows,
    deviceRows,
    countryRows,
    gaPages,
  ] = await Promise.all([
    gaReport(ga, property, currentDates),
    gaReport(ga, property, previousDates),
    gscDateRows(await gscQuery(search, siteUrl, currentDates, ["date"])),
    gscDateRows(await gscQuery(search, siteUrl, previousDates, ["date"])),
    gscQuery(search, siteUrl, currentDates, ["query"], 8),
    gscQuery(search, siteUrl, currentDates, ["page"], 8),
    gscQuery(search, siteUrl, currentDates, ["device"], 10),
    gscQuery(search, siteUrl, currentDates, ["country"], 10),
    gaPageReport(ga, property, currentDates),
  ]);
  const gaByDate = new Map(gaCurrent.map((row) => [row.date, row]));
  const gaPrevByDate = new Map(gaPrevious.map((row) => [row.date, row]));
  const gscByDate = new Map(gscCurrent.map((row) => [row.date, row]));
  const gscPrevByDate = new Map(gscPrevious.map((row) => [row.date, row]));

  const buildSeries = (startDate, endDate, gaMap, gscMap) => {
    const list = [];
    const curr = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T00:00:00Z");
    while (curr <= end) {
      const dStr = curr.toISOString().slice(0, 10);
      const ga = gaMap.get(dStr) || {};
      const gsc = gscMap.get(dStr) || {};
      list.push({
        date: dStr,
        organic: number(ga.organic),
        views: number(ga.views),
        engagement: number(ga.engagement),
        conversions: number(ga.conversions),
        unique: number(ga.unique),
        clicks: number(gsc.clicks),
        impressions: number(gsc.impressions),
        position: number(gsc.position),
      });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return list;
  };

  const current = buildSeries(
    currentDates.startDate,
    currentDates.endDate,
    gaByDate,
    gscByDate,
  );
  const previous = buildSeries(
    previousDates.startDate,
    previousDates.endDate,
    gaPrevByDate,
    gscPrevByDate,
  );
  const currentTotals = totals(current);
  const previousTotals = totals(previous);
  const deviceTotal = deviceRows.reduce(
    (sum, row) => sum + number(row.clicks),
    0,
  );
  const countryTotal = countryRows.reduce(
    (sum, row) => sum + number(row.clicks),
    0,
  );
  return {
    source: "google",
    range: days,
    series: current,
    totals: currentTotals,
    deltas: {
      organic: pct(currentTotals.organic, previousTotals.organic),
      views: pct(currentTotals.views, previousTotals.views),
      engagement: pct(currentTotals.engagement, previousTotals.engagement),
      conversions: pct(currentTotals.conversions, previousTotals.conversions),
      impressions: pct(currentTotals.impressions, previousTotals.impressions),
      ctr: previousTotals.impressions
        ? Number(
            (
              (((currentTotals.clicks / currentTotals.impressions) * 100 -
                (previousTotals.clicks / previousTotals.impressions) * 100) /
                ((previousTotals.clicks / previousTotals.impressions) * 100 ||
                  1)) *
              100
            ).toFixed(1),
          )
        : 0,
      avgPosition: previousTotals.avgPosition
        ? Number(
            (currentTotals.avgPosition - previousTotals.avgPosition).toFixed(1),
          )
        : 0,
    },
    devices: deviceRows.map((row) => ({
      name: row.keys?.[0] || "Unknown",
      value: number(row.clicks),
      pct: deviceTotal
        ? Math.round((number(row.clicks) / deviceTotal) * 100)
        : 0,
    })),
    countries: countryRows.map((row) => ({
      name: row.keys?.[0] || "Unknown",
      value: number(row.clicks),
      pct: countryTotal
        ? Math.round((number(row.clicks) / countryTotal) * 100)
        : 0,
    })),
    topPages: pageRows.map((row) => {
      const pageUrl = row.keys?.[0] || "";
      let pathname = pageUrl;
      try {
        pathname = new URL(pageUrl).pathname;
      } catch (e) {}
      const match = (gaPages || []).find(
        (p) =>
          p.path === pathname ||
          p.path === pageUrl ||
          (p.path && pathname.endsWith(p.path)) ||
          (p.path && pageUrl.includes(p.path)),
      );
      return {
        title: pageUrl,
        slug: pathname || pageUrl,
        views: match ? match.views : 0,
        organic: number(row.clicks),
        ctr: Number(((row.ctr || 0) * 100).toFixed(1)),
      };
    }),
    topKeywords: queryRows.map((row) => ({
      keyword: row.keys?.[0] || "",
      position: Number((row.position || 0).toFixed(1)),
      previousPosition: null,
      volume: null,
      clicks: number(row.clicks),
      difficulty: null,
    })),
    ctr: currentTotals.impressions
      ? Number(
          ((currentTotals.clicks / currentTotals.impressions) * 100).toFixed(1),
        )
      : 0,
  };
}

export async function getSearchConsoleKeywords(days = 90) {
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!siteUrl) throw new Error("GSC_SITE_URL is not configured.");
  const auth = await authClient();
  const search = google.searchconsole({ version: "v1", auth });
  const dates = rangeDates(days);
  const rows = await gscQuery(search, siteUrl, dates, ["query"], 100);
  return rows.map((row) => ({
    keyword: row.keys?.[0] || "",
    clicks: number(row.clicks),
    impressions: number(row.impressions),
    ctr: Number(((row.ctr || 0) * 100).toFixed(1)),
    position: Number((row.position || 0).toFixed(1)),
  }));
}
