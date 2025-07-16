// _modules/MusicPlayer/index.js
import play from "play-dl";
import { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, AudioPlayerStatus } from "@discordjs/voice";


export default class MusicPlayer {
    constructor() {
        this.isPlaying = {};
        this.queue = {};
        this.connection = {};
        this.dispatcher = {};
    }

    /**
     * Checks if a given URL is a YouTube playlist URL.
     * @param {string} url The URL to check.
     * @returns {boolean} True if it's a playlist URL, false otherwise.
     */
    isPlayList(url) {
        // Check for '&list' parameter and ensure it's not a YouTube Music URL (which often uses '&list' for albums)
        if (url.includes("&list") && !url.includes("music.youtube")) {
            return true;
        }
        return false;
    }

    /**
     * Joins the bot to a voice channel and processes the music request (single song or playlist).
     * Adds music to the queue and starts playback if nothing is currently playing.
     * This method assumes the interaction has already been deferred by the command handler.
     * @param {object} interaction The Discord interaction object (already deferred).
     * @param {string} musicURL The URL of the music or playlist.
     * @param {string} voiceChannelID The ID of the voice channel to join.
     */
    async play(interaction, musicURL, voiceChannelID) {
        const guildID = interaction.guildId;

        // Join the voice channel
        this.connection[guildID] = joinVoiceChannel({
            channelId: voiceChannelID,
            guildId: guildID,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });

        try {
            // Initialize queue if it doesn't exist for this guild
            if (!this.queue[guildID]) {
                this.queue[guildID] = [];
            }

            let musicName = null;

            const isPlayList = this.isPlayList(musicURL);
            if (isPlayList) {
                // Handle YouTube Playlists
                const res = await play.playlist_info(musicURL);
                musicName = res.title;

                const videoTitles = res.videos.map((v, i) => `[${i + 1}] ${v.title}`).slice(0, 10).join("\n");
                // Edit the deferred reply to show playlist information
                await interaction.editReply({content: `**加入播放清單：${musicName}**\nID 識別碼：[${res.id}]\n==========================\n${videoTitles}\n……以及其他 ${res.videos.length - 10} 首歌 `});

                // Add all videos from the playlist to the queue
                res.videos.forEach(v => {
                    this.queue[guildID].push({
                        id: v.id, // Use video ID for individual songs in playlist
                        name: v.title,
                        url: v.url
                    });
                });

            } else {
                // Handle single YouTube Videos
                const res = await play.video_basic_info(musicURL);
                musicName = res.video_details.title;

                this.queue[guildID].push({
                    id: res.video_details.id,
                    name: musicName,
                    url: musicURL
                });
            }

            // If music is already playing, add to queue and send confirmation
            if (this.isPlaying[guildID]) {
                await interaction.followUp({ // Use followUp for subsequent messages
                    embeds: [{
                        author: {
                            name: "Added to queue"
                        },
                        title: musicName,
                        url: musicURL,
                        color: 0x00f5e4,
                        footer: {
                            text: "Music Player",
                            icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                        },
                        timestamp: new Date()
                    }]
                });
            } else {
                // If nothing is playing, start playing the first song in the queue
                this.isPlaying[guildID] = true;
                await this.playMusic(interaction, this.queue[guildID][0]); // No need for isReplied param now
            }

        } catch (e) {
            console.error("[MusicPlayer] Error in play method:", e); // Log the full error for debugging
            // Edit the deferred reply with an error message
            await interaction.editReply({
                embeds: [{
                    author: {
                        name: "Error"
                    },
                    title: "Failed to play music.",
                    description: `Reason: ${e.message || "Unknown error."}\nPlease ensure the URL is valid or try a different search query.`,
                    color: 0xff0000,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
        }
    }

    /**
     * Plays the next music in the queue.
     * @param {object} interaction The Discord interaction object (already deferred).
     */
    async playNextMusic(interaction) {
        const guildID = interaction.guildId;

        if (this.queue[guildID]?.length > 0) {
            await this.playMusic(interaction, this.queue[guildID][0]);
        } else {
            this.isPlaying[guildID] = false; // No more music in queue
            await interaction.followUp({ // Use followUp for subsequent messages
                embeds: [{
                    author: {
                        name: "Queue Empty"
                    },
                    title: "No more music in the queue. Disconnecting soon.",
                    color: 0xff0000,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
            // Optionally, disconnect after a short delay if queue is empty
            // setTimeout(() => this.leave(interaction), 5 * 60 * 1000); // Disconnect after 5 minutes of inactivity
        }
    }

    /**
     * Handles the actual playback of a single music track.
     * This method assumes the interaction has already been deferred by the command handler.
     * @param {object} interaction The Discord interaction object (already deferred).
     * @param {object} musicInfo An object containing music details (name, url).
     */
    async playMusic(interaction, musicInfo) {
        const guildID = interaction.guildId;

        try {
            // Edit the deferred reply with "Now Playing" message
            await interaction.editReply({
                embeds: [{
                    author: {
                        name: "Now Playing"
                    },
                    title: musicInfo.name,
                    url: musicInfo.url,
                    color: 0x9f00f5,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });

            // Get the audio stream using play-dl
            const stream = await play.stream(musicInfo.url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            // Create an audio player
            const player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                }
            });

            // Play the resource
            player.play(resource);

            // Subscribe the connection to the player
            this.connection[guildID].subscribe(player);
            this.dispatcher[guildID] = player; // Store the player instance

            // Remove the played song from the queue
            this.queue[guildID].shift();

            // Set up event listener for when the player becomes idle (song ends)
            player.on("stateChange", (oldState, newState) => {
                if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                    this.playNextMusic(interaction); // Play the next song
                }
            });
        } catch (e) {
            console.error(`[MusicPlayer] Error playing music "${musicInfo.url}":`, e); // More specific error log
            // Send an error message as a follow-up
            await interaction.followUp({
                embeds: [{
                    author: {
                        name: "Error"
                    },
                    title: "Error playing music",
                    description: `Could not play: ${musicInfo.name}. Reason: ${e.message || "Unknown error."}`,
                    color: 0xff0000,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });

            // Attempt to play the next song even if the current one failed
            // This is important to prevent the queue from getting stuck
            await this.playNextMusic(interaction);
        }
    }

    /**
     * Resumes playback of the current music.
     * This method assumes the interaction has already been deferred by the command handler.
     * @param {object} interaction The Discord interaction object (already deferred).
     */
    async resume(interaction) {
        const guildID = interaction.guildId;
        if (this.dispatcher[guildID]) {
            this.dispatcher[guildID].unpause();
            await interaction.editReply({ // Edit the deferred reply
                embeds: [{
                    author: {
                        name: "Resume"
                    },
                    title: "Resume playing music",
                    color: 0x00f549,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
        } else {
            await interaction.editReply({ // Edit the deferred reply
                embeds: [{
                    author: {
                        name: "Error"
                    },
                    title: "No music to resume.",
                    color: 0xff0000,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
        }
    }

    /**
     * Pauses playback of the current music.
     * This method assumes the interaction has already been deferred by the command handler.
     * @param {object} interaction The Discord interaction object (already deferred).
     */
    async pause(interaction) {
        const guildID = interaction.guildId;
        if (this.dispatcher[guildID]) {
            this.dispatcher[guildID].pause();
            await interaction.editReply({ // Edit the deferred reply
                embeds: [{
                    author: {
                        name: "Pause"
                    },
                    title: "Pause current music",
                    color: 0xf5ed00,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
        } else {
            await interaction.editReply({ // Edit the deferred reply
                embeds: [{
                    author: {
                        name: "Error"
                    },
                    title: "No music to pause.",
                    color: 0xff0000,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
        }
    }

    /**
     * Skips the current song.
     * This method assumes the interaction has already been deferred by the command handler.
     * @param {object} interaction The Discord interaction object (already deferred).
     */
    async skip(interaction) {
        const guildID = interaction.guildId;
        if (this.dispatcher[guildID]) {
            this.dispatcher[guildID].stop(); // Stopping the player triggers the 'idle' state, which calls playNextMusic
            await interaction.editReply({ content: "Skipped current music." }); // Edit the deferred reply
        } else {
            await interaction.editReply({ content: "Bot is not currently playing music." }); // Edit the deferred reply
        }
    }

    /**
     * Lists all queued music.
     * This method assumes the interaction has already been deferred by the command handler.
     * @param {object} interaction The Discord interaction object (already deferred).
     */
    async nowQueue(interaction) {
        const guildID = interaction.guildId;

        if (this.queue[guildID] && this.queue[guildID].length > 0) {
            let queueString = "";

            let queue = this.queue[guildID].map((item, index) => `[${index + 1}] ${item.name}`);
            if (queue.length > 10) {
                queue = queue.slice(0, 10);
                queueString = `Current Queue:\n${queue.join("\n")}\n...and ${this.queue[guildID].length - 10} more songs.`;
            } else {
                queueString = `Current Queue:\n${queue.join("\n")}`;
            }

            await interaction.editReply({ content: queueString }); // Edit the deferred reply
        } else {
            await interaction.editReply({ // Edit the deferred reply
                embeds: [{
                    author: {
                        name: "Error"
                    },
                    title: "There is no music in the queue.",
                    color: 0xff0000,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
        }
    }

    /**
     * Deletes all songs from a specific playlist ID from the queue.
     * This method assumes the interaction has already been deferred by the command handler.
     * @param {object} interaction The Discord interaction object (already deferred).
     * @param {string} musicID The ID of the playlist to delete.
     */
    async deletePlayList(interaction, musicID) {
        const guildID = interaction.guildId;

        const initialQueueLength = this.queue[guildID]?.length || 0;
        this.queue[guildID] = this.queue[guildID].filter(q => q.id !== musicID);
        const songsRemoved = initialQueueLength - (this.queue[guildID]?.length || 0);

        if (songsRemoved > 0) {
            await interaction.editReply({ // Edit the deferred reply
                embeds: [{
                    author: {
                        name: "Deleted"
                    },
                    title: `Removed ${songsRemoved} song(s) with ID ${musicID} from queue.`,
                    color: 0xf58300,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
        } else {
            await interaction.editReply({ // Edit the deferred reply
                embeds: [{
                    author: {
                        name: "Error"
                    },
                    title: `No songs with ID ${musicID} found in the queue.`,
                    color: 0xff0000,
                    footer: {
                        text: "Music Player",
                        icon_url: "https://i.ibb.co/CnqFvTF/image-2023-07-06-152548513.jpg"
                    },
                    timestamp: new Date()
                }]
            });
        }
    }

    /**
     * Makes the bot leave the voice channel and clears the queue.
     * This method assumes the interaction has already been deferred by the command handler.
     * @param {object} interaction The Discord interaction object (already deferred).
     */
    async leave(interaction) {
        const guildID = interaction.guildId;

        if (this.connection[guildID]) {
            if (Object.prototype.hasOwnProperty.call(this.queue, guildID)) {
                delete this.queue[guildID];
                this.isPlaying[guildID] = false;
            }
            if (this.dispatcher[guildID]) {
                this.dispatcher[guildID].stop(); // Stop current playback
                delete this.dispatcher[guildID];
            }

            this.connection[guildID].destroy(); // Use .destroy() to properly disconnect
            delete this.connection[guildID];

            await interaction.editReply({ content: "Left the voice channel." }); // Edit the deferred reply
        } else {
            await interaction.editReply({ content: "Bot is not currently in a voice channel." }); // Edit the deferred reply
        }
    }
}
