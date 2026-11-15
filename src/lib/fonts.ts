import localFont from "next/font/local";

/** Self-hosted (no runtime or build-time calls to Google Fonts). Both are SIL OFL. */
export const vazir = localFont({
  src: "../fonts/Vazirmatn-Variable.woff2",
  variable: "--font-vazir",
  weight: "100 900",
  display: "swap",
});

export const fraunces = localFont({
  src: "../fonts/Fraunces-Variable.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});
