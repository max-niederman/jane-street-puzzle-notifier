import * as cheerio from "cheerio";

export type Results = {
  name: string;
  leaderboard: string[];
};

export type ResultsDiff = {
  nameChanged: boolean;
  leaderboard: {
    added: string[];
    removed: string[];
  };
};

export function diffResults(from: Results, to: Results) {
  const nameChanged = from.name !== to.name;

  const added = to.leaderboard.filter(
    (name) => !from.leaderboard.includes(name)
  );
  const removed = from.leaderboard.filter(
    (name) => !to.leaderboard.includes(name)
  );

  return {
    nameChanged,
    leaderboard: {
      added,
      removed,
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
  };
}
