import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import DemoToasts from "./demo-toasts";
import MobileBuyBar from "./mobile-buy-bar";
import WhatsAppContact from "./whatsapp-contact";
import CelebrationLayer from "./celebration-layer";
const display=localFont({src:[{path:"./fonts/Poppins-Regular.woff2",weight:"400"},{path:"./fonts/Poppins-Medium.woff2",weight:"500"},{path:"./fonts/Poppins-SemiBold.woff2",weight:"600"},{path:"./fonts/Poppins-Bold.woff2",weight:"700"}],variable:"--font-display",display:"swap"});
const sans=localFont({src:"./fonts/DM-Sans.woff2",weight:"100 1000",variable:"--font-body",display:"swap"});
export const metadata = {
  metadataBase:new URL("https://www.detoxleaf.in"),
  title: "Fresh Wheatgrass Trays and Delivery Plans | Detoxleaf",
  description: "Pure Wellness From Nature. Fresh wheatgrass trays, thoughtfully grown and delivered for your daily green ritual.",
};
export default function RootLayout({ children }) {
  return <html lang="en" className={`${display.variable} ${sans.variable}`}><body><CelebrationLayer/>{children}<DemoToasts/><WhatsAppContact/><MobileBuyBar/><Script id="google-tag-manager-init">{`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`}</Script><Script id="google-tag-manager" src="https://www.googletagmanager.com/gtm.js?id=GTM-WCLNCLXJ"/></body></html>;
}
