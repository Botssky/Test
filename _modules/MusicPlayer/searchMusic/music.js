import axios from "axios";

const cache = {};
const CACHE_TTL_HOURS = 24; // Cache entries expire after 24 hours

/**
 * Extracts the YouTube video ID from a given URL.
 * Supports standard YouTube watch URLs and shortened URLs.
 * @param {string} query The URL string.
 * @returns {string|null} The YouTube video ID or null.
 */
function extractYouTubeId(query) {
    try {
        const url = new URL(query);

        if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
            if (url.hostname.includes("youtube.com")) {
                const videoId = url.searchParams.get("v");
                if (videoId) return videoId;
            }
            if (url.hostname === "youtu.be") {
                const match = url.pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
                if (match) return match[1];
            }
        }
        return null;
    } catch {
        return null; // Not a valid URL
    }
}


/**
 * Searches for music on YouTube by URL or query.
 * @param {string} query The search query or YouTube URL.
 * @returns {Promise<string>} A promise that resolves with the YouTube video ID.
 */
export default async function searchMusic(query) {
    try {
        if (cache[query] && (new Date() - cache[query].timestamp) / (3600000) < CACHE_TTL_HOURS) {
            console.log(`[searchMusic] Cache hit for "${query}"`);
            cache[query].timestamp = new Date();
            return cache[query].id;
        }

        let videoId = extractYouTubeId(query);

        if (videoId) {
            console.log(`[searchMusic] Validating YouTube video ID: "${videoId}"`);
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
                throw new Error("Music not found or invalid YouTube video ID.");
            }

            cache[query] = { id: videoId, timestamp: new Date() };
            return videoId;
        } else {
            console.log(`[searchMusic] Searching YouTube for query: "${query}"`);
            const response = await axios.get(
                "https://youtube.googleapis.com/youtube/v3/search",
                {
                    params: {
                        q: query,
                        type: "video",
                        maxResults: 1,
                        part: "snippet",
                        key: process.env.YOUTUBE_API_KEY,
                    },
                }
            );

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error("Music not found for your query.");
            }

            const foundId = response.data.items[0].id.videoId;
            cache[query] = { id: foundId, timestamp: new Date() };
            return foundId;
        }
    } catch (error) {
        console.error(`[searchMusic] Error for query "${query}":`, error.message);
        if (axios.isAxiosError(error) && error.response) {
            const { status, statusText } = error.response;
            if (status === 403) {
                throw new Error("YouTube API quota exceeded or invalid API key.");
            }
            throw new Error(`YouTube API error: ${status} - ${statusText}`);
        }
        throw error;
    }
}
