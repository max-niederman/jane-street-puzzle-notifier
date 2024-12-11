import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import { Persist, type SubscriptionType } from "./persist";
import { diffResults, scrape } from "./scrape";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const persist = new Persist();

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const action = interaction.commandName;
  if (action !== "subscribe" && action !== "unsubscribe") {
    await interaction.reply("Sorry, I don't recognize that command.");
    return;
  }

  const channel =
    interaction.options.getChannel("channel") ?? interaction.channel;
  if (!channel) {
    await interaction.reply("Please specify a channel.");
    return;
  }

  const subType: SubscriptionType | unknown =
    interaction.options.getSubcommand();
  if (subType !== "puzzle" && subType !== "leaderboard") {
    await interaction.reply("Sorry, I don't recognize that subscription type.");
    return;
  }

  const prevSubscriptions = persist.subscriptions[channel.id] ?? [];

  if (action === "subscribe") {
    if (prevSubscriptions.includes(subType)) {
      await interaction.reply("You're already subscribed to that.");
      return;
    }

    persist.subscriptions[channel.id] = [...prevSubscriptions, subType];
    await persist.save();
    await interaction.reply(`Subscribed to ${subType} updates in ${channel}`);
  } else {
    if (!prevSubscriptions.includes(subType)) {
      await interaction.reply("You're not subscribed to that.");
      return;
    }

    persist.subscriptions[channel.id] = prevSubscriptions.filter(
      (s) => s !== subType
    );
    await persist.save();
    await interaction.reply(
      `Unsubscribed from ${subType} updates in ${channel}`
    );
  }
});

console.log("Performing initial scrape...");
let results = await scrape();
console.log("Initial scrape completed with results: ", results);

async function scrapeAndNotify() {
  console.log("Scraping...");
  const newResults = await scrape();
  console.log("Scrape completed with results: ", newResults);

  const diff = diffResults(results, newResults);
  if (diff.nameChanged) {
    console.log("Puzzle name changed!");
    for (const [channelID, subscriptions] of Object.entries(
      persist.subscriptions
    )) {
      const channel: TextChannel = await client.channels.fetch(channelID);

      if (subscriptions.includes("puzzle")) {
        await channel.send(
          `🧩 [The puzzle](<https://www.janestreet.com/puzzles/current-puzzle/>) name has changed! It's now: ${newResults.name}`
        );
      }
    }
  }

  if (diff.leaderboard.added.length || diff.leaderboard.removed.length) {
    console.log("Leaderboard changed!");
    for (const [channelID, subscriptions] of Object.entries(
      persist.subscriptions
    )) {
      const channel: TextChannel = await client.channels.fetch(channelID);

      if (subscriptions.includes("leaderboard")) {
        const files = [
          {
            name: "leaderboard.txt",
            description: "New leaderboard",
            attachment: Buffer.from(newResults.leaderboard.join("\n")),
          },
        ];

        const added = diff.leaderboard.added
          .map((name) => `+ ${name}`)
          .join("\n");
        const removed = diff.leaderboard.removed
          .map((name) => `\\- ${name}`)
          .join("\n");

        if (added.length + removed.length > 1000) {
          files.push({
            name: "diff.txt",
            description: "Difference between the old and new leaderboards",
            attachment: Buffer.from(`${added}\n${removed}`),
          });

          await channel.send({
            content:
              "📈 The leaderboard has changed! There are too many changes to summarize here, but a diff is attached.",
            files,
          });
          continue;
        }

        await channel.send({
          content: `📈 Leaderboard changes:\n${added}\n${removed}`,
          files,
        });
      }
    }
  }

  results = newResults;
}

await persist.load();
client.login(process.env.DISCORD_TOKEN);
setInterval(
  scrapeAndNotify,
  Number(process.env.SCRAPE_INTERVAL ?? "60") * 1000
);
