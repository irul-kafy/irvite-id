import { PublicMediaDescriptor } from '../types/public-invitation';

export default function MediaGallery({ media }: { media: PublicMediaDescriptor[] }) {
  if (!media || media.length === 0) return null;

  // Prefix with proxy path for Next.js rewrites
  const resolveSrc = (src: string) => `/api-proxy${src}`;

  const thumbnails = media.filter((m) => m.type === 'THUMBNAIL');
  const photos = media.filter((m) => m.type === 'PHOTO');
  const videos = media.filter((m) => m.type === 'VIDEO');
  const audios = media.filter((m) => m.type === 'AUDIO');

  return (
    <div className="media-gallery space-y-8 my-8">
      {thumbnails.length > 0 && (
        <div className="thumbnails flex justify-center">
          {thumbnails.map((m) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={m.src}
              src={resolveSrc(m.src)}
              alt="Hero Thumbnail"
              className="max-w-full h-auto rounded shadow-lg"
            />
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="photos grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((m) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={m.src}
              src={resolveSrc(m.src)}
              alt="Gallery Photo"
              className="w-full h-auto object-cover rounded shadow"
            />
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className="videos space-y-4">
          {videos.map((m) => (
            <video
              key={m.src}
              controls
              preload="metadata"
              className="w-full max-w-2xl mx-auto rounded shadow-md"
            >
              <source src={resolveSrc(m.src)} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ))}
        </div>
      )}

      {audios.length > 0 && (
        <div className="audios space-y-4">
          {audios.map((m) => (
            <audio
              key={m.src}
              controls
              preload="metadata"
              className="w-full max-w-md mx-auto block"
            >
              <source src={resolveSrc(m.src)} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          ))}
        </div>
      )}
    </div>
  );
}
