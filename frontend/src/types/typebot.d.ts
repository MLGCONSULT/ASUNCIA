import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "typebot-standard": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export {};

