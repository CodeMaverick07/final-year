"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

type FullscreenImageViewerProps = {
  images: { url: string; id: string }[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
};

export function FullscreenImageViewer({
  images,
  initialIndex,
  isOpen,
  onClose,
}: FullscreenImageViewerProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex: initialIndex });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useEffect(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    });
  }, [emblaApi]);

  useEffect(() => {
    if (isOpen && emblaApi) {
      emblaApi.scrollTo(initialIndex);
    }
  }, [isOpen, initialIndex, emblaApi]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        aria-label="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              emblaApi?.scrollPrev();
            }}
            disabled={selectedIndex === 0}
            className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              emblaApi?.scrollNext();
            }}
            disabled={selectedIndex === images.length - 1}
            className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Image carousel */}
      <div className="relative h-full w-full" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-hidden h-full" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((image) => (
              <div key={image.id} className="min-w-0 flex-[0_0_100%] flex items-center justify-center">
                <img
                  src={image.url}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm text-white">
          {selectedIndex + 1} / {images.length}
        </div>
      )}

      {/* Keyboard navigation */}
      <div
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
          if (e.key === "ArrowRight") emblaApi?.scrollNext();
        }}
        className="absolute inset-0"
      />
    </div>
  );
}
