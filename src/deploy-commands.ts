import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("subscribe")
    .setDescription("Subscribe to updates about Jane Street's puzzles")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The type of updates to subscribe to")
        .setRequired(true)
        .setChoices(
          { name: "leaderboard", value: "leaderboard" },
          { name: "puzzle", value: "puzzle" }
        )
    )
    .addChannelOption((option) =>
      option.setName("channel").setDescription("The channel to subscribe")
    ),
  new SlashCommandBuilder()
    .setName("unsubscribe")
    .setDescription("Unsubscribe from updates about Jane Street's puzzles")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The type of updates to unsubscribe from")
        .setRequired(true)
        .setChoices(
          { name: "leaderboard", value: "leaderboard" },
          { name: "puzzle", value: "puzzle" }
        )
    )
    .addChannelOption((option) =>
      option.setName("channel").setDescription("The channel to unsubscribe")
    ),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log("Started refreshing application (/) commands.");

  const res = await rest.put(
    Routes.applicationCommands(process.env.DISCORD_APPID),
    { body: commands.map((cmd) => cmd.toJSON()) }
  );

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}
