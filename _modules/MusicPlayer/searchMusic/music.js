import axios from "axios";

const cache = {};
const CACHE_TTL_HOURS = 24; // Cache entries expire after 24 hours

/**
 * Extracts the YouTube video ID from a given URL.
 * Supports standard YouTube watch URLs (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
 * and shortened YouTube URLs (e.g., youtu.be).
 *
 * @param {string} query The URL string to extract the ID from.
 * @returns {string|null} The YouTube video ID if found, otherwise null.
 */
function extractYouTubeId(query) {
    try {
        const url = new URL(query);

        // Standard YouTube watch URL: https://www.youtube.com/watch?v=VIDEO_ID
        if (url.hostname.includes("youtube.com")) {
            return url.searchParams.get("v");
        }

        // Shortened YouTube URL: https://youtu.be/VIDEO_ID
        if (url.hostname === "youtu.be") {
            return url.pathname.slice(1);
        }

        return null;
    } catch {
        return null; // Not a valid URL
    }
}

/**
 * Searches for music on YouTube, either by a direct video URL or a search query.
 * It utilizes a simple in-memory cache to store recent results and reduce API calls.
 *
 * @param {string} query The search query or YouTube video URL.
 * @returns {Promise<string>} A promise that resolves with the YouTube video ID.
 * @throws {Error} Throws an error if the music is not found or if there's an API issue.
 */
export default async function searchMusic(query) {
    try {
        // 1. Check cache first
        if (cache[query] && (new Date() - cache[query].timestamp) / (1000 * 60 * 60) < CACHE_TTL_HOURS) {
            console.log(`[searchMusic] Cache hit for "${query}"`);
            // Update timestamp to keep frequently accessed items fresh
            cache[query].timestamp = new Date();
            return cache[query].id;
        }

        let videoId = extractYouTubeId(query);

        if (videoId) {
            // 2. If a video ID is extracted, validate its existence via the YouTube Data API
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
                console.log(`[searchMusic] Video not found for ID: "${videoId}"`);
                throw new Error("Music not found or invalid YouTube video ID.");
            }

            // Cache the valid video ID
            cache[query] = {
                id: videoId,
                timestamp: new Date(),
            };

            return videoId;
        } else {
            // 3. If no video ID, perform a Youtube
            console.log(`[searchMusic] Searching YouTube for query: "${query}"`);
            const response = await axios.get(
                "https://youtube.googleapis.com/youtube/v3/search",
                {
                    params: {
                        q: query,
                        type: "video",
                        maxResults: 1, // Get only the top result
                        key: process.env.YOUTUBE_API_KEY,
                    },
                }
            );

            if (!response.data.items || response.data.items.length === 0) {
                console.log(`[searchMusic] No results found for query: "${query}"`);
                throw new Error("Music not found for your query.");
            }

            const foundId = response.data.items[0].id.videoId;

            // Cache the search result
            cache[query] = {
                id: foundId,
                timestamp: new Date(),
            };

            return foundId;
        }
    } catch (error) {
        console.error(`[searchMusic] Error searching for "${query}":`, error.message);

        // Provide more specific error messages based on API response
        if (axios.isAxiosError(error) && error.response) {
            if (error.response.status === 403) {
                throw new Error("YouTube API quota exceeded or invalid API key. Please check your API key and daily limits.");
            } else if (error.response.status === 404) {
                throw new Error("YouTube resource not found.");
            } else {
                throw new Error(`YouTube API error: ${error.response.status} - ${error.response.statusText}`);
            }
        } else {
            // Re-throw if it's an error from within our logic (e.g., "Music not found")
            throw error;
        }
    }
}
