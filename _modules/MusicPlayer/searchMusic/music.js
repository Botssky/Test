import axios from "axios";

export default async function searchMusic(string) {
    const cache = {};

    try {
        if (cache[string]) {
            cache[string].timestamp = new Date();
            return cache[string].id;
        } else {
            const response = await axios.get(
                "https://youtube.googleapis.com/youtube/v3/search",
                {
                    params: {
                        q: string,
                        channelType: "any",
                        type: "video",
                        maxResults: 1,
                        key: process.env.YOUTUBE_API_KEY,
                    },
                }
            );

            if (!response.data.items || response.data.items.length === 0) {
                console.log(`[searchMusic] No results for query: "${string}"`);
                throw new Error("Music not found");
            }

            cache[string] = {
                id: response.data.items[0].id.videoId,
                timestamp: new Date(),
            };

            return cache[string].id;
        }
    } catch (error) {
        console.error(`[searchMusic] Error searching for "${string}":`, error.message);
        throw new Error("Music not found");
    }
}
