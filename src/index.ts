import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import { Persist, type SubscriptionType } from "./persist";
import { diffResults, scrape, type Results } from "./scrape";

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
let results: Results = process.env.DEBUG
  ? { name: "", leaderboard: [], time: new Date() }
  : await scrape();
console.log("Initial scrape completed with results: ", results);

async function scrapeAndNotify() {
  console.log("Scraping...");
  const newResults = await scrape();
  console.log("Scrape completed with results: ", newResults);

  const diff = diffResults(results, newResults);
  if (diff.name.changed) {
    console.log("Puzzle name changed!");
    for (const [channelID, subscriptions] of Object.entries(
      persist.subscriptions
    )) {
      const channel: TextChannel = await client.channels.fetch(channelID);

      if (subscriptions.includes("puzzle")) {
        await channel.send(
          `# Puzzle Name Changed To "${newResults.name}"
[The puzzle](<https://www.janestreet.com/puzzles/current-puzzle/>) name has changed! It's now "${newResults.name}"`
        );
      }
    }
  }

  if (diff.leaderboard.changed) {
    console.log("Leaderboard changed!");

    const leaderboardFile = Buffer.from(newResults.leaderboard.join("\n"));

    const message =
      diff.leaderboard.description.length > 2000
        ? {
            content: `# Leaderboard Changed
The leaderboard has changed! The diff is too long to display here, but it's attached.`,
            files: [
              {
                name: "leaderboard.diff",
                title: "Diff",
                contentType: "text/x-diff",
                attachment: Buffer.from(diff.leaderboard.description),
              },
              {
                name: "leaderboard.txt",
                title: "New Leaderboard",
                attachment: leaderboardFile,
              },
            ],
          }
        : {
            content: `# Leaderboard Changed
\`\`\`diff
${diff.leaderboard.description}
\`\`\``,
            files: [
              {
                name: "leaderboard.txt",
                description: "New leaderboard",
                attachment: leaderboardFile,
              },
            ],
          };

    for (const [channelID, subscriptions] of Object.entries(
      persist.subscriptions
    )) {
      const channel: TextChannel = await client.channels.fetch(channelID);

      if (subscriptions.includes("leaderboard")) {
        await channel.send(message);
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
