"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { FullscreenImageViewer } from "@/components/ui/FullscreenImageViewer";

type MediaItem = {
  id: string;
  type: string;
  url: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
};

type MediaCarouselProps = {
  media: MediaItem[];
};

export default function MediaCarousel({ media }: MediaCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  // Filter out PDFs - they should be converted to images
  const displayMedia = media.filter((m) => m.mimeType !== "application/pdf" && !m.url.toLowerCase().endsWith(".pdf"));

  if (displayMedia.length === 0) return null;

  // Get only images for fullscreen viewer
  const imageMedia = displayMedia.filter((m) => m.type === "IMAGE");

  const handleImageClick = (index: number) => {
    // Find the index in the imageMedia array
    let imageIndex = 0;
    for (let i = 0; i < displayMedia.length; i++) {
      if (displayMedia[i].type === "IMAGE") {
        if (i === index) {
          setFullscreenIndex(imageIndex);
          return;
        }
        imageIndex++;
      }
    }
  };

  if (displayMedia.length === 1) {
    return (
      <>
        <div className="overflow-hidden rounded-lg">
          {renderMedia(displayMedia[0], 0, handleImageClick)}
        </div>
        {fullscreenIndex !== null && imageMedia.length > 0 && (
          <FullscreenImageViewer
            images={imageMedia.map((m) => ({ url: m.url, id: m.id }))}
            initialIndex={fullscreenIndex}
            isOpen={true}
            onClose={() => setFullscreenIndex(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="overflow-hidden rounded-lg" ref={emblaRef}>
          <div className="flex">
            {displayMedia.map((item, index) => (
              <div key={item.id} className="min-w-0 flex-[0_0_100%]">
                {renderMedia(item, index, handleImageClick)}
              </div>
            ))}
          </div>
        </div>
        {/* Dots */}
        {scrollSnaps.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {scrollSnaps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === selectedIndex
                    ? "w-4 bg-accent"
                    : "w-1.5 bg-text-muted/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
      {fullscreenIndex !== null && imageMedia.length > 0 && (
        <FullscreenImageViewer
          images={imageMedia.map((m) => ({ url: m.url, id: m.id }))}
          initialIndex={fullscreenIndex}
          isOpen={true}
          onClose={() => setFullscreenIndex(null)}
        />
      )}
    </>
  );
}

function renderMedia(
  item: MediaItem,
  index: number,
  onImageClick: (index: number) => void
) {
  if (item.type === "IMAGE") {
    return (
      <img
        src={item.url}
        alt=""
        loading="lazy"
        className="aspect-[4/5] w-full cursor-pointer bg-bg object-contain transition-opacity hover:opacity-90 sm:aspect-[4/3]"
        onClick={() => onImageClick(index)}
      />
    );
  }

  if (item.type === "VIDEO") {
    return (
      <video
        src={item.url}
        controls
        preload="metadata"
        className="aspect-[9/16] w-full bg-black object-contain sm:aspect-video"
      />
    );
  }

  if (item.type === "AUDIO") {
    return (
      <div className="flex aspect-[4/5] flex-col items-center justify-center gap-4 bg-bg-surface p-4 sm:aspect-[4/3] sm:p-6">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5">
          <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <audio src={item.url} controls preload="metadata" className="w-full max-w-xs" />
        {item.duration && (
          <span className="text-xs text-text-muted">
            {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, "0")}
          </span>
        )}
      </div>
    );
  }

  return null;
}
