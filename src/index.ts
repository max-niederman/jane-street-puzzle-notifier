import { Client, Events, GatewayIntentBits } from "discord.js";
import { Persist, type SubscriptionType } from "./persist";

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

await persist.load();

client.login(process.env.DISCORD_TOKEN);
