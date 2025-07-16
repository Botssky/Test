import { SlashCommandBuilder, ChannelType } from "discord.js";

import MusicPlayer from "../../_modules/MusicPlayer/index.js";
import searchMusic from "../../_modules/MusicPlayer/searchMusic/music.js";

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
                        .setName("music")
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
        ),

    async execute({ interaction }) {
        try {
            switch (interaction.options.getSubcommand()) {
                case "play": {
                    const music = interaction.options.getString("music");
                    const voiceChannel = interaction.options.getChannel("channel");

                    // Regex YouTube-linkkien tunnistukseen
                    // youtu.be/VIDEOID
                    // youtube.com/watch?v=VIDEOID
                    const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?youtu\.be\/[a-zA-Z0-9_-]{11}$|^(https?:\/\/)?(www|m|music)\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/;

                    if (youtubeUrlRegex.test(music)) {
                        // Jos käyttäjä antoi suoran URL:n
                        await player.play(interaction, music, voiceChannel.id);
                    } else {
                        // Hae video ID hakusanalla
                        const musicID = await searchMusic(music);
                        await player.play(interaction, `https://www.youtube.com/watch?v=${musicID}`, voiceChannel.id);
                    }
                    break;
                }

                case "skip":
                    await player.playNextMusic(interaction);
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

                default:
                    await interaction.reply({ content: "Invalid subcommand", ephemeral: true });
            }
        } catch (error) {
            console.error("Error in /music command:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "An error occurred: " + error.message, ephemeral: true });
            }
        }
    }
};
