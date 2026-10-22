"use client";
import {usePathname} from "next/navigation";
const messages={
 "/fresh-wheatgrass":"Hi Detoxleaf! 🌱 I'd love to know more about your fresh wheatgrass trays, how to use them, and delivery availability in my area.",
 "/subscriptions":"Hi Detoxleaf! 🌱 I'm interested in a wheatgrass subscription. Could you help me choose a plan and check delivery availability?",
 "/cart":"Hi Detoxleaf! 🌱 I have a question about my basket before ordering. Could you help me with the products and delivery options?",
 "/checkout":"Hi Detoxleaf! 🌱 I need a little help completing my order and checking delivery options. Could you guide me?",
 "/track-order":"Hi Detoxleaf! 🌱 I'd like help tracking my order. Please let me know which order details you need.",
};
export default function WhatsAppContact(){
 const pathname=usePathname();
 if(pathname?.startsWith("/admin")||["/login","/signup","/forgot-password","/reset-password","/access-pending"].includes(pathname))return null;
 const text=messages[pathname]||(pathname?.startsWith("/account")?"Hi Detoxleaf! 🌱 I need help with my account or an order. Could you help me?":"Hi Detoxleaf! 🌱 I'm interested in your fresh wheatgrass. Could you help me choose the right option and check delivery availability in my area?");
 const url="https://api.whatsapp.com/send/?"+new URLSearchParams({phone:"918796159077",text,type:"phone_number",app_absent:"0"}).toString();
 return <a className="whatsapp-contact" href={url} target="_blank" rel="noopener noreferrer" aria-label="Chat with Detoxleaf on WhatsApp (opens in a new tab)" title="Questions about wheatgrass or delivery? Chat with us on WhatsApp."><span className="whatsapp-contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.87 11.87 0 0 0 12.06 0C5.47 0 .1 5.36.1 11.95c0 2.1.55 4.15 1.6 5.96L0 24l6.25-1.64a11.94 11.94 0 0 0 5.8 1.48h.01C18.65 23.84 24 18.48 24 11.9c0-3.18-1.24-6.17-3.48-8.42ZM12.06 21.83a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.87 9.87 0 0 1-1.51-5.27c0-5.48 4.46-9.94 9.95-9.94a9.87 9.87 0 0 1 7.03 2.92 9.87 9.87 0 0 1 2.91 7.03c0 5.48-4.46 9.87-10.02 9.87Zm5.45-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.69.25-1.29.18-1.41-.08-.13-.28-.2-.58-.35Z"/></svg></span><span className="whatsapp-contact-copy"><small>A little help, naturally.</small><strong>Chat with us <span aria-hidden="true">↗</span></strong></span><span className="whatsapp-contact-dot" aria-hidden="true"/></a>;
}
