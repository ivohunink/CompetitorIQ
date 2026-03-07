import { parseWebsite } from "./website";
import { parseChangelog } from "./changelog";
import { parseDocs } from "./docs";
import { parseG2 } from "./g2";
import { parseCapterra } from "./capterra";

export type SourceType = "website" | "changelog" | "docs" | "g2" | "capterra";

const parsers: Record<SourceType, (html: string, url: string) => string> = {
  website: parseWebsite,
  changelog: parseChangelog,
  docs: parseDocs,
  g2: parseG2,
  capterra: parseCapterra,
};

export function parseContent(
  html: string,
  url: string,
  sourceType: string
): string {
  const parser = parsers[sourceType as SourceType] ?? parsers.website;
  return parser(html, url);
}
