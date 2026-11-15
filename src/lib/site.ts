export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3100").replace(/\/+$/, "");
}
