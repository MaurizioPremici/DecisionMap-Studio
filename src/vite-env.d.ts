/// <reference types="vite/client" />

interface Window {
  desktopClipboard?: {
    readImage: () =>
      | Promise<{
          dataUrl?: string;
          text?: string;
          name: string;
          type: string;
        } | null>
      | {
          dataUrl?: string;
          text?: string;
          name: string;
          type: string;
        }
      | null;
  };
}
