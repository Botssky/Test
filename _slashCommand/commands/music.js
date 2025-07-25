// _slashCommand/commands/music.js
import { SlashCommandBuilder, ChannelType } from "discord.js";

import MusicPlayer from "../../_modules/MusicPlayer/index.js";
import searchMusic from "../../_modules/MusicPlayer/searchMusic/music.js"; // Ensure this path is correct

const player = new MusicPlayer();

export default {
    data: new SlashCommandBuilder()
        .setName("music")
        .setDescription("Use a music player")
        .addSubcommand(subcommand =>
            subcommand
                .setName("play")
                .setDescription("Play or search for music")
                .addStringOption(option =>
                    option
                        .setName("query") // Renamed 'music' to 'query' for clarity
                        .setDescription("Search for music or provide a YouTube URL")
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Select a voice channel to play music")
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("skip")
                .setDescription("Skip current music")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("pause")
                .setDescription("Pause current music")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("resume")
                .setDescription("Resume paused music")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("List all queued music")
        )
        .addSubcommand(subcommand => // Added a subcommand for leaving the channel
            subcommand
                .setName("leave")
                .setDescription("Make the bot leave the voice channel and clear queue")
        )
        .addSubcommand(subcommand => // Added a subcommand for deleting playlist by ID
            subcommand
                .setName("deleteplaylist")
                .setDescription("Delete all songs from a specific playlist ID from the queue")
                .addStringOption(option =>
                    option
                        .setName("playlist_id")
                        .setDescription("The ID of the playlist to remove (e.g., from /music play output)")
                        .setRequired(true)
                )
        ),

    async execute({ interaction }) {
        // Defer the reply to prevent timeout errors
        await interaction.deferReply({ ephemeral: false });

        try {
            switch (interaction.options.getSubcommand()) {
                case "play": {
                    const query = interaction.options.getString("query");
                    const voiceChannel = interaction.options.getChannel("channel");

                    const musicID = await searchMusic(query);
                    await player.play(interaction, `https://www.youtube.com/watch?v=${musicID}`, voiceChannel.id);
                    break;
                }

                case "skip":
                    await player.skip(interaction);
                    break;

                case "pause":
                    await player.pause(interaction);
                    break;

                case "resume":
                    await player.resume(interaction);
                    break;

                case "list":
                    await player.nowQueue(interaction);
                    break;

                case "leave":
                    await player.leave(interaction);
                    break;

                case "deleteplaylist":
                    const playlistIdToDelete = interaction.options.getString("playlist_id");
                    await player.deletePlayList(interaction, playlistIdToDelete);
                    break;

                default:
                    await interaction.editReply({ content: "Invalid subcommand.", ephemeral: true });
            }
        } catch (error) {
            console.error("Error in /music command:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "An error occurred: " + error.message, ephemeral: true });
            } else {
                await interaction.editReply({ content: "An error occurred: " + error.message, ephemeral: true });
            }
        }
    }
};
