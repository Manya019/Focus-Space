import axios from 'axios';

// Pexels API Key - You can get a free one at https://www.pexels.com/api/
// Using a placeholder - if missing, we use our premium curated fallbacks
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || '';

const FALLBACK_VIDEOS = {
  Nature: [
    "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-over-a-mountain-9061-large.mp4",
    "https://res.cloudinary.com/dqcsk8rsc/video/upload/v1664467403/forest_vibe.mp4"
  ],
  Urban: [
    "https://assets.mixkit.co/videos/preview/mixkit-raindrops-on-a-window-at-night-1533-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-coffee-is-poured-into-a-cup-from-a-coffee-pot-23395-large.mp4"
  ],
  Cosmic: [
    "https://assets.mixkit.co/videos/preview/mixkit-starry-sky-with-a-faint-nebula-at-night-9061-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-night-sky-with-stars-and-a-bright-moon-9061-large.mp4"
  ]
};

export const fetchThemeVideos = async (theme) => {
  if (!PEXELS_API_KEY) {
    console.warn("PEXELS_API_KEY missing. Using curated fallbacks for theme:", theme);
    return FALLBACK_VIDEOS[theme] || FALLBACK_VIDEOS.Nature;
  }

  try {
    const response = await axios.get(`https://api.pexels.com/videos/search?query=${theme}&per_page=5&orientation=landscape`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });

    return response.data.videos.map(v => v.video_files.find(f => f.quality === 'hd')?.link || v.video_files[0].link);
  } catch (error) {
    console.error("Error fetching from Pexels API:", error);
    return FALLBACK_VIDEOS[theme] || FALLBACK_VIDEOS.Nature;
  }
};
