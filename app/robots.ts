import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/organizer/"],
    },
    sitemap: "https://www.draftwithfriends.com/sitemap.xml",
  };
}
