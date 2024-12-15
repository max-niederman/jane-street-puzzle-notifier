import * as cheerio from "cheerio";
import * as difflib from "difflib";

export type Results = {
  name: string;
  leaderboard: string[];
  time: Date;
};

export type ResultsDiff = {
  name: {
    changed: boolean;
  };
  leaderboard: {
    changed: boolean;
    description: string;
  };
};

export function diffResults(from: Results, to: Results): ResultsDiff {
  const nameChanged = from.name !== to.name;

  const leaderboardChanged =
    from.leaderboard.join("\n") !== to.leaderboard.join("\n");
  const leaderboardDescription = difflib
    .unifiedDiff(
      from.leaderboard,
      to.leaderboard,
      {
        fromfile: "leaderboard.txt",
        fromfiledate: from.time.toISOString(),
        tofile: "leaderboard.txt",
        tofiledate: to.time.toISOString(),
      }
    )
    .join("\n");

  return {
    name: { changed: nameChanged },
    leaderboard: {
      changed: leaderboardChanged,
      description: leaderboardDescription,
    },
  };
}

export async function scrape(): Promise<Results> {
  const humanPage = await fetch(
    "https://www.janestreet.com/puzzles/current-puzzle/"
  );
  if (!humanPage.ok) {
    throw new Error("Failed to fetch human page");
  }
  const humanPageHTML = cheerio.load(await humanPage.text());

  const name = humanPageHTML(".content h3").text();
  if (!name) {
    throw new Error("Failed to find puzzle name");
  }

  const dataDirectory = humanPageHTML(".content .correct-submissions").attr(
    "data-directory"
  );
  if (!dataDirectory) {
    throw new Error("Failed to find data directory");
  }

  const leaderboardJSON = await (
    await fetch(
      `https://www.janestreet.com/puzzles/${dataDirectory}-leaderboard.json`
    )
  ).json();
  if (!leaderboardJSON.leaders) {
    throw new Error("Failed to parse leaderboard");
  }

  return {
    name,
    leaderboard: leaderboardJSON.leaders,
    time: new Date(),
  };
}
