import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("subscribe")
    .setDescription("Subscribe to updates about Jane Street's puzzles")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("puzzle")
        .setDescription("Subscribe to new puzzle updates")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send updates to")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("Subscribe to leaderboard updates")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send updates to")
        )
    ),
  new SlashCommandBuilder()
    .setName("unsubscribe")
    .setDescription("Unsubscribe from updates about Jane Street's puzzles")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("puzzle")
        .setDescription("Unsubscribe from new puzzle updates")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("The channel to unsubscribe")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("Unsubscribe from leaderboard updates")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("The channel to unsubscribe")
        )
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
