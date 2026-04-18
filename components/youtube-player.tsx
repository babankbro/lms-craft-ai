import { extractYouTubeId } from "@/lib/youtube";

interface YouTubePlayerProps {
  url: string;
  title?: string;
}

export function YouTubePlayer({ url, title }: YouTubePlayerProps) {
  const videoId = extractYouTubeId(url);

  if (!videoId) return null;

  return (
    <div className="mb-4 aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title || "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full rounded-lg"
      />
    </div>
  );
}
