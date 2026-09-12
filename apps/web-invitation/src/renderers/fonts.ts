import { Inter, Playfair_Display, Lora, Montserrat } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' });
const lora = Lora({ subsets: ['latin'], display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap' });

export const FONT_MAP: Record<string, string> = {
  INTER: inter.className,
  PLAYFAIR_DISPLAY: playfair.className,
  LORA: lora.className,
  MONTSERRAT: montserrat.className,
};
