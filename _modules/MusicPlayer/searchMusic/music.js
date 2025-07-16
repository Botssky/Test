import axios from "axios";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";


const cache = {};

export default async function searchMusic(string) {
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
                        maxResults: 5,  // Haetaan useampi video
                        key: process.env.YOUTUBE_API_KEY,
                    },
                }
            );

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error("Music not found");
            }

            // Käy läpi videot ja palauta ensimmäinen kelvollinen videoId
            for (const item of response.data.items) {
                if (item.id?.videoId) {
                    cache[string] = {
                        id: item.id.videoId,
                        timestamp: new Date(),
                    };
                    return cache[string].id;
                }
            }

            throw new Error("Music not found");
        }
    } catch (error) {
        throw new Error("Music not found");
    }
}
