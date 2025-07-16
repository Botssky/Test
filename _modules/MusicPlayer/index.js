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

    isPlayList(url) {
        return play.yt_validate(url) === 'playlist';
    }

    async play(interaction, musicURL, voiceChannelID) {
        const guildID = interaction.guildId;

        this.connection[guildID] = joinVoiceChannel({
            channelId: voiceChannelID,
            guildId: guildID,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });

        try {
            if (!this.queue[guildID]) {
                this.queue[guildID] = [];
            }

            if (this.isPlayList(musicURL)) {
                const playlist = await play.playlist_info(musicURL, { incomplete: true });
                const videos = await playlist.all_videos();
                
                videos.forEach(v => {
                    this.queue[guildID].push({
                        id: playlist.id,
                        name: v.title,
                        url: v.url
                    });
                });

                const playlistMessage = `**Added Playlist: ${playlist.title}**\nID: [${playlist.id}]\n==========================\n${videos.slice(0, 10).map((v, i) => `[${i+1}] ${v.title}`).join('\n')}\n...and ${videos.length > 10 ? videos.length - 10 + ' more songs.' : ''}`;
                await interaction.editReply({ content: playlistMessage });

            } else {
                const videoInfo = await play.video_basic_info(musicURL);
                const music = {
                    id: videoInfo.video_details.id,
                    name: videoInfo.video_details.title,
                    url: videoInfo.video_details.url
                };

                this.queue[guildID].push(music);

                if (this.isPlaying[guildID]) {
                    await interaction.editReply({
                        embeds: [{
                            author: { name: "Added to queue" },
                            title: music.name,
                            url: music.url,
                            color: 0x00f5e4,
                            timestamp: new Date()
                        }]
                    });
                }
            }

            if (!this.isPlaying[guildID]) {
                this.isPlaying[guildID] = true;
                this.playMusic(interaction, this.queue[guildID][0]);
            }

        } catch (e) {
            console.error("[MusicPlayer] Error in play method:", e);
            await interaction.editReply({
                embeds: [{
                    author: { name: "Error" },
                    title: "Failed to play music.",
                    description: `Reason: ${e.message || "Unknown error."}`,
                    color: 0xff0000,
                    timestamp: new Date()
                }]
            });
        }
    }

    async playMusic(interaction, musicInfo) {
        const guildID = interaction.guildId;

        try {
            await interaction.editReply({
                embeds: [{
                    author: { name: "Now Playing" },
                    title: musicInfo.name,
                    url: musicInfo.url,
                    color: 0x9f00f5,
                    timestamp: new Date()
                }]
            });

            const stream = await play.stream(musicInfo.url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play }});

            player.play(resource);
            this.connection[guildID].subscribe(player);
            this.dispatcher[guildID] = player;

            player.on(AudioPlayerStatus.Idle, () => {
                this.queue[guildID].shift();
                if (this.queue[guildID].length > 0) {
                    this.playMusic(interaction, this.queue[guildID][0]);
                } else {
                    this.isPlaying[guildID] = false;
                    interaction.followUp({ content: "Queue is empty. I will leave the channel in 5 minutes if no more songs are added."});
                    setTimeout(() => {
                        if(!this.isPlaying[guildID] && this.connection[guildID]) {
                           this.leave(interaction);
                        }
                    }, 300000); // 5 minutes
                }
            });

        } catch (e) {
            console.error(`[MusicPlayer] Error playing music "${musicInfo.url}":`, e);
            await interaction.followUp({
                embeds: [{
                    author: { name: "Error" },
                    title: `Error playing: ${musicInfo.name}`,
                    description: `Reason: ${e.message || "Unknown error."}`,
                    color: 0xff0000,
                    timestamp: new Date()
                }]
            });
            // Try to play the next song
            this.queue[guildID].shift();
            if (this.queue[guildID].length > 0) {
                this.playMusic(interaction, this.queue[guildID][0]);
            } else {
                this.isPlaying[guildID] = false;
            }
        }
    }
    
    // ... (rest of the methods: resume, pause, skip, nowQueue, deletePlayList, leave)
    // No changes were strictly necessary for the other methods, but ensuring they
    // use interaction.editReply or interaction.followUp consistently is important.
    // The provided corrections above should give you a good template for those.
}
