import { NextResponse } from "next/server";

export async function GET() {
  const repoOwner = process.env.GITHUB_REPO_OWNER || "";
  const repoName = process.env.GITHUB_REPO_NAME || "";
  const token = process.env.GITHUB_PAT || "";

  try {
    if (!repoOwner || !repoName) throw new Error("No repo set");

    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "nuuvi-app",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const latestRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=1`,
      { headers, cache: "no-store" }
    );

    if (!latestRes.ok) throw new Error("Failed to fetch commit");
    const [latestCommit] = await latestRes.json();

    const countRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=1&page=1`,
      { headers, cache: "no-store" }
    );
    const linkHeader = countRes.headers.get("link");
    let totalCommits = 0;

    if (linkHeader) {
      const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
      if (match && match[1]) {
        totalCommits = parseInt(match[1], 10);
      }
    }

    const versionTag = `MS.NV-${String(totalCommits).padStart(2, "0")}`;
    const fullMessage: string = latestCommit.commit.message || "";
    const [title, ...bodyLines] = fullMessage.split("\n");
    const rawBullets = bodyLines
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-") || l.startsWith("*") || l.length > 0)
      .map((l) => l.replace(/^[-*]\s*/, ""));

    return NextResponse.json({
      version: versionTag,
      title: title || "System & Interface Update",
      date: new Date(latestCommit.commit.author.date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      changes: rawBullets.length > 0 ? rawBullets : [
        "Updated interface controls and responsive layout scaling.",
        "Profile customizations and dynamic user accents enabled.",
      ],
    });
  } catch {
    return NextResponse.json({
      version: "MS.NV-00",
      title: "Initial System Baseline",
      date: "October 16, 2026",
      changes: [
        "Appearance and device-specific rendering settings initialized.",
        "Real-time commit synchronization configured.",
        "Custom palette selection and theme-aware contrast enhancements.",
      ],
    });
  }
}