import Link from "next/link";
import SiteFooter from "../site-footer";
import Reveal from "../reveal";
import BrandLogo from "../brand-logo";
export const metadata = {
  title: "Our Story | Detox Leaf",
  description: "Get to know Detox Leaf: fresh wheatgrass, thoughtful growing, and a little daily connection to nature.",
};
function Leaf({ size = 28 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 4C10 2 3 7 5 14c2 7 13 7 15-10Z"/><path d="m4 21 11-11M10 15v-5"/></svg>;
}
const grass = "https://images.unsplash.com/photo-1757557768362-89bc57635dbd?auto=format&fit=crop&w=1800&q=85";
const values = [
  ["01", "Freshness comes first.", "We believe greens should feel alive. Fresh wheatgrass is at the heart of what we do, from the way we grow to the way we pack."],
  ["02", "Keep it simple.", "A fresh tray, a few snips, a moment for yourself. Bringing more green into your day should be a simple habit you look forward to."],
  ["03", "Care in every detail.", "Goodness begins long before it reaches your kitchen. Thoughtful growing and careful handling are part of the same promise."],
];
export default function About() {
  return <>
    <div className="announcement"><Leaf size={16}/> Fresh beginnings. Farm grown. Home delivered.</div>
    <header className="header about-header"><BrandLogo/><nav className="about-navigation" aria-label="Main navigation"><Link href="/#shop">Shop</Link><Link href="/#farm">Our farm</Link><Link href="/about" aria-current="page">About us</Link></nav><Link className="button outline about-header-cta" href="/#shop">Shop fresh <span aria-hidden="true">↗</span></Link></header>
    <main className="about-page">
      <Reveal as="section" immediate className="about-hero"><div className="section-wrap about-hero-grid"><div><p className="eyebrow">A LITTLE ABOUT US</p><h1>Good things<br/>start with<br/><em>a little green.</em></h1><p className="about-intro">We’re Detox Leaf. We bring fresh wheatgrass closer to your everyday life, one thoughtfully grown tray at a time.</p><a href="#our-story" className="about-scroll">Get to know us <span aria-hidden="true">↓</span></a></div><div className="about-hero-image" role="img" aria-label="Fresh green wheatgrass with its delicate roots" style={{backgroundImage:`url(${grass})`}}><span className="about-image-note"><Leaf size={19}/> ROOTED IN NATURE</span></div></div><div className="about-wordmark" aria-hidden="true">GROW A LITTLE GOOD.</div></Reveal>
      <Reveal as="section" className="section-wrap about-story" id="our-story"><div><p className="eyebrow">OUR STORY</p><h2>A fresh approach<br/>to <em>everyday goodness.</em></h2></div><div className="about-story-copy"><p>Life moves fast. We like the idea of starting the day with something that grows slowly, naturally, and with care.</p><p>That’s the thought behind Detox Leaf: make fresh greens an easy part of your routine. Wheatgrass doesn’t need to be complicated. It can be a small, simple connection to nature, right there on your kitchen counter.</p><p>From the first green shoot to your morning ritual, we want every tray to bring a little freshness into your home.</p></div></Reveal>
      <Reveal as="section" className="about-quote"><div className="section-wrap"><Leaf size={42}/><blockquote>“A little closer to nature.<br/>A little greener, <em>every day.</em>”</blockquote><p>THE DETOX LEAF PHILOSOPHY</p></div></Reveal>
      <Reveal as="section" className="section-wrap about-values"><div className="section-heading"><div><p className="eyebrow">WHAT MATTERS TO US</p><h2>Small details.<br/><em>Thoughtful intentions.</em></h2></div><p className="about-heading-copy">The things we keep coming back to,<br/>in every tray and every day.</p></div><div className="about-value-grid">{values.map(([number,title,copy],index)=><Reveal as="article" delay={index*0.1} className="about-value" key={number}><span className="about-value-number">{number}</span><Leaf size={34}/><h3>{title}</h3><p>{copy}</p></Reveal>)}</div></Reveal>
      <Reveal as="section" className="about-process"><div className="section-wrap about-process-grid"><div className="about-process-image" role="img" aria-label="Close-up of living wheatgrass shoots and roots" style={{backgroundImage:`url(${grass})`}}><span>Goodness starts at the roots.</span></div><div><p className="eyebrow">FROM SEED TO YOUR DOOR</p><h2>A little care.<br/><em>At every step.</em></h2><p className="about-process-intro">There’s a whole journey behind your little tray of green.</p><ol className="about-process-list"><li><span>01</span><div><h3>It starts with growing.</h3><p>Seeds, water, light, and attention. We give our wheatgrass room to become something fresh.</p></div></li><li><span>02</span><div><h3>Then comes thoughtful packing.</h3><p>We handle the greens with care, ready for the journey from our farm to your home.</p></div></li><li><span>03</span><div><h3>The next chapter is yours.</h3><p>Snip, juice, or blend. Make a little space for green in a routine that works for you.</p></div></li></ol></div></div></Reveal>
      <Reveal as="section" className="about-cta section-wrap"><p className="eyebrow">YOUR FRESH START IS WAITING</p><h2>Let’s grow a <em>greener routine.</em></h2><p>A little tray of freshness. A moment to make your own.</p><Link href="/#shop" className="button green">Find your daily green <span aria-hidden="true">↗</span></Link></Reveal>
    </main>
    <SiteFooter/>
  </>;
}




