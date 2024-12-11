import type { Snowflake } from "discord.js";

export type SubscriptionType = "puzzle" | "leaderboard";

export class Persist {
  subscriptions: Record<Snowflake, SubscriptionType[]> = {};

  path: string;

  constructor() {
    if (!process.env.STATE_PATH) {
      throw new Error("STATE_PATH must be set");
    }

    this.path = process.env.STATE_PATH;
  }

  async load() {
    const file = await Bun.file(this.path);

    if (!await file.exists()) {
      return;
    }

    const json = await file.json();
    this.subscriptions = json.subscriptions;
  }

  async save() {
    await Bun.write(
      this.path,
      JSON.stringify({
        subscriptions: this.subscriptions,
      })
    );
  }
}
