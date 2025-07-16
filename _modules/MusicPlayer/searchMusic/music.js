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
                        maxResults: 1,
                        key: process.env.YOUTUBE_API_KEY,  // Lue avain ympäristömuuttujasta
                    },
                }
            );

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error("Music not found");
            }

            cache[string] = {
                id: response.data.items[0].id.videoId,
                timestamp: new Date(),
            };

            return cache[string].id;
        }
    } catch (error) {
        throw new Error("Music not found");
    }
}
