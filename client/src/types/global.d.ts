declare global {
  interface Window {
    // Add any global window properties here
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export {}; 