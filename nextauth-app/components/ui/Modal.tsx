"use client";

import * as Dialog from "@radix-ui/react-dialog";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
};

export default function Modal({ open, onOpenChange, title, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-bg-surface p-4 shadow-2xl sm:p-6">
          {title && (
            <Dialog.Title className="mb-4 font-heading text-xl font-semibold text-text-primary">
              {title}
            </Dialog.Title>
          )}
          {children}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-border hover:text-text-primary"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
