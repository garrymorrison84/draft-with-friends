import type { MetadataRoute } from "next";

const routes = [
  "",
  "/football",
  "/football/create",
  "/create-pool",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://www.draftwithfriends.com${route}`,
    lastModified: new Date("2026-07-13"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
