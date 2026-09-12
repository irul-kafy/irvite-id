import { Inter, Playfair_Display, Lora, Montserrat } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const playfairDisplay = Playfair_Display({ subsets: ['latin'], display: 'swap' });
const lora = Lora({ subsets: ['latin'], display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap' });

export interface FontInfo {
  className: string;
  label: string;
  family: string;
}

export const ADMIN_FONT_MAP: Record<string, FontInfo> = {
  INTER: { className: inter.className, label: 'Inter', family: inter.style.fontFamily },
  PLAYFAIR_DISPLAY: { className: playfairDisplay.className, label: 'Playfair Display', family: playfairDisplay.style.fontFamily },
  LORA: { className: lora.className, label: 'Lora', family: lora.style.fontFamily },
  MONTSERRAT: { className: montserrat.className, label: 'Montserrat', family: montserrat.style.fontFamily },
};

/** Inter font for admin UI typography */
export const adminUiFont = inter;
