import { Inter, Montserrat } from "next/font/google";

/** Body / UI — matches former Google Fonts Inter 300–700. */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

/** Sidebar chrome — matches former Montserrat 500–600. */
export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});
