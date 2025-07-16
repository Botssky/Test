import axios from "axios";

const cache = {};

export default async function searchMusic(query) {
    try {
        if (cache[query]) {
            cache[query].timestamp = new Date();
            return cache[query].id;
        }

        let videoId = null;

        // Jos query on YouTube-linkki, yritä purkaa ID
        const match = query.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
        if (match) {
            videoId = match[1];
        }

        if (videoId) {
            // Tarkista että video on olemassa
            const response = await axios.get(
                "https://youtube.googleapis.com/youtube/v3/videos",
                {
                    params: {
                        part: "snippet",
                        id: videoId,
                        key: process.env.YOUTUBE_API_KEY,
                    },
                }
            );

            if (!response.data.items || response.data.items.length === 0) {
                console.log(`[searchMusic] Video not found for ID: "${videoId}"`);
                throw new Error("Music not found");
            }

            cache[query] = {
                id: videoId,
                timestamp: new Date(),
            };

            return videoId;
        } else {
            // Muuten tee normaali haku
            const response = await axios.get(
                "https://youtube.googleapis.com/youtube/v3/search",
                {
                    params: {
                        q: query,
                        type: "video",
                        maxResults: 1,
                        key: process.env.YOUTUBE_API_KEY,
                    },
                }
            );

            if (!response.data.items || response.data.items.length === 0) {
                console.log(`[searchMusic] No results for query: "${query}"`);
                throw new Error("Music not found");
            }

            const foundId = response.data.items[0].id.videoId;

            cache[query] = {
                id: foundId,
                timestamp: new Date(),
            };

            return foundId;
        }
    } catch (error) {
        console.error(`[searchMusic] Error searching for "${query}":`, error.message);
        throw new Error("Music not found");
    }
}
