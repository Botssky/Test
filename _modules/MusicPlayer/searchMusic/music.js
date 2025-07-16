import axios from "axios";

const cache = {};

function extractYouTubeId(query) {
    try {
        const url = new URL(query);

        if (url.hostname === "youtu.be") {
            return url.pathname.slice(1);
        }

        if (url.hostname.includes("youtube.com")) {
            return url.searchParams.get("v");
        }

        return null;
    } catch {
        return null;
    }
}

export default async function searchMusic(query) {
    try {
        if (cache[query]) {
            cache[query].timestamp = new Date();
            return cache[query].id;
        }

        let videoId = extractYouTubeId(query);

        if (videoId) {
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
