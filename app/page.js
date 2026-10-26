"use client";

import { useState } from "react";
import { usePreviewCart } from "./commerce-preview";
import {useCatalog,publicProduct} from "./commerce/client";
import PlansList from "./plans-list";
const priceFor=(product,subscription)=>subscription?product.subscriptionPrice:product.price;
const stockFor=state=>({available:state.product.available});

import Link from "next/link";

import SiteFooter from "./site-footer";
import BrandLogo from "./brand-logo";
import Image from "next/image";
import Reveal from "./reveal";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

function Icon({ name = "leaf", size = 24 }) {
  const paths = {
    leaf: <><path d="M20 4C10 2 3 7 5 14c2 7 13 7 15-10Z"/><path d="m4 21 11-11M10 15v-5"/></>,
    sprout: <><path d="M12 21V11M12 14C3 14 3 5 3 5s9 0 9 9ZM12 11c0-8 9-8 9-8s0 8-9 8"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
    truck: <><path d="M2 5h12v12H2zM14 10h4l4 5v2h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
    box: <><path d="m3 7 9-5 9 5v11l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v11M7 4l9 5"/></>,
    heart: <path d="M12 21 3 12C-3 5 7-1 12 6c5-7 15-1 9 6l-9 9Z"/>,
    check: <path d="m5 12 4 4L20 5"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    arrow: <path d="M3 12h18m-6-6 6 6-6 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.leaf}</svg>;
}
export default function Home() {
  const [quantity, setQuantity] = useState(1);
  const [previewCart, saveCart] = usePreviewCart();
  const cart = previewCart.quantity;
  const catalog=useCatalog(); const operations={product:publicProduct(catalog)};
  const grass=operations.product.image;
  const homepagePhoto=catalog.images?.filter(image=>image.product_id===operations.product.id&&image.sort_order<0).sort((a,b)=>a.sort_order-b.sort_order)[0]?.url||"/media/wheatgrass-tray.png";
  const cartVariant=catalog.variants.find(v=>v.id===previewCart.variantId)||operations.product.variant;
  const cartPlan=catalog.plans.find(p=>p.id===previewCart.planId)||operations.product.plan;
  const cartTotal=cart*(previewCart.subscription&&cartPlan?cartPlan.price_paise:cartVariant?.price_paise||0)/100;
  const [cartOpen, setCartOpen] = useState(false);
  const [subscription, setSubscription] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const price=priceFor(operations.product,subscription);
  const available=stockFor(operations).available;
  const reducedMotion = useReducedMotion();
  return <>
    <div className="announcement"><Icon name="sprout" size={14}/> FARM FRESH WHEATGRASS · DELIVERED TO YOUR DOOR</div>
    <header className="header home-header"><BrandLogo/>
      <nav className={menuOpen ? "nav open" : "nav"} aria-label="Main navigation"><Link href="/shop" onClick={()=>setMenuOpen(false)}>Shop</Link><a href="#subscriptions" onClick={()=>{setSubscription(operations.product.subscriptionPrice>0);setMenuOpen(false);}}>Subscriptions <span className="nav-tag">SUBSCRIBE</span></a><Link href="/our-farm" onClick={()=>setMenuOpen(false)}>Our farm</Link><a href="#ritual" onClick={()=>setMenuOpen(false)}>Why Detox Leaf</a><Link href="/recipes" onClick={()=>setMenuOpen(false)}>Recipes</Link><Link href="/blog" onClick={()=>setMenuOpen(false)}>Blog</Link><Link href="/about" onClick={()=>setMenuOpen(false)}>About us</Link><Link className="mobile-only-nav" href="/account" onClick={()=>setMenuOpen(false)}>My account</Link><Link className="mobile-only-nav" href="/wishlist" onClick={()=>setMenuOpen(false)}>Wishlist</Link></nav>
      <div className="header-actions" aria-label="Shopping tools"><Link className="header-icon-action header-account-action" href="/account" aria-label="My account" title="My account"><Icon name="user" size={20}/></Link><Link className="header-icon-action" href="/search" aria-label="Search website" title="Search"><Icon name="search" size={20}/></Link><Link className="header-icon-action header-wishlist-action" href="/wishlist" aria-label="Your wishlist" title="Wishlist"><Icon name="heart" size={20}/></Link><span className="header-action-divider" aria-hidden="true"/><button className="cart-button header-bag-action" onClick={()=>setCartOpen(true)} aria-label={`Open cart, ${cart} items`} title="Open your bag"><Icon name="bag" size={20}/><span className="header-bag-label">Bag</span><span className="cart-count">{cart>99?'99+':cart}</span></button><button className="menu-button header-icon-action" onClick={()=>setMenuOpen(!menuOpen)} aria-label={menuOpen?"Close navigation":"Open navigation"} aria-expanded={menuOpen}><Icon name={menuOpen?"close":"menu"} size={21}/></button></div>
    </header>
    <main>
      <section className="hero premium-hero">
        <Image className="hero-wheatgrass-background" src="/media/wheatgrass-hero.png" alt="" fill sizes="100vw" preload/>
        <div className="hero-shade"/><div className="hero-grain"/>
        <Reveal immediate delay={0.12} className="hero-copy"><p className="eyebrow"><span/> SMALL HABIT. BIG CHANGE.</p><h1>Fresh wheatgrass.<br/>Pure wellness.<br/><em>From nature.</em></h1><p className="hero-description">Start your morning with fresh wheatgrass juice.<br/>Farm-grown greens to snip, juice, and enjoy as part of a balanced lifestyle.</p><div className="hero-buttons"><a href="#shop" className="button cream">Shop now <Icon name="arrow" size={20}/></a><a href="#subscriptions" className="hero-link" onClick={()=>setSubscription(operations.product.subscriptionPrice>0)}>Subscribe & save <span>↗</span></a></div><div className="hero-note"><Icon name="sprout" size={19}/> Freshly grown. Ready to juice. Made for your morning.</div></Reveal>
        <a className="hero-editorial-card" href="#shop"><span className="hero-card-index">01 / YOUR MORNING SHOT</span><div><span>Fresh greens.<br/><em>Your daily juice.</em></span><Icon name="arrow" size={25}/></div><p>Shop wheatgrass for juicing <span>↗</span></p></a>
        <a className="hero-scroll" href="#shop">MAKE WELLNESS A RITUAL <span aria-hidden="true">↓</span></a>
      </section>
      <Reveal as="section" className="trust-strip" aria-label="Our promises">{[["sprout","Farm grown"],["sun","Freshly harvested"],["truck","Home delivered"],["leaf","Naturally grown"]].map(([icon,label])=><div key={label}><Icon name={icon}/><span>{label}</span></div>)}</Reveal>
      <Reveal as="section" className="shop-section section-wrap premium-shop" id="shop">
        <div className="section-heading"><div><p className="eyebrow">THE DAILY GREEN / 01</p><h2>Goodness, <em>still growing.</em></h2></div><p className="shop-heading-note">A small ritual with roots.<br/>Fresh from the farm. Made for your morning.</p></div>
        <div className="product">
          <div className="product-gallery"><div className="product-photo" role="img" aria-label="Fresh upright wheatgrass growing in a tray" style={{backgroundImage:`linear-gradient(180deg,transparent 55%,rgba(12,37,22,.72) 100%),url(${homepagePhoto})`}}><span className="photo-label"><Icon name="sprout" size={18}/> THE LIVING COLLECTION</span><div className="product-image-seal"><span>FRESH</span><Icon name="leaf" size={32}/><span>BY NATURE</span></div><div className="photo-bottom"><span>Rooted in care.<br/><em>Ready for your ritual.</em></span><span className="photo-index">01 — WHEATGRASS</span></div></div><div className="gallery-caption"><span>Nature’s little everyday essential.</span><span>GROW · SNIP · ENJOY</span></div></div>
          <div className="product-info"><div className="product-topline"><span className="product-category">FARM-FRESH WHEATGRASS</span><span className="product-bestseller"><span/> Fresh from the farm</span></div><h3>Your fresh start,<br/><em>in a little tray.</em></h3><p className="product-description">Fresh wheatgrass trays · 1.25 kg per tray. ₹500 per tray, with a complimentary tray for every tray purchased on your first eligible one-time order.</p><div className="product-details"><span><Icon name="sprout" size={19}/> Living greens</span><span><Icon name="box" size={19}/> 1.25 kg per tray</span><span><Icon name="check" size={19}/> No preservatives</span></div>
            <div className="product-price-row"><div className="price">{price>0?"₹"+price:"Check availability"}{operations.product.discount>0&&<del>₹{operations.product.price}</del>}</div><span className="offer">FIRST ORDER 1+1<small>Buy one tray. Get one free.</small></span></div>
            <fieldset className="purchase-options"><legend>Choose your ritual</legend><label className={`purchase-option ${!subscription ? "selected" : ""}`}><input type="radio" name="purchase-plan" checked={!subscription} onChange={()=>setSubscription(false)}/><span><strong>A fresh start</strong><small>One-time purchase · 1 tray</small></span><b>{operations.product.price>0?"₹"+operations.product.price:"Unavailable"}</b></label><label className={`purchase-option ${subscription ? "selected" : ""}`}><input type="radio" name="purchase-plan" checked={subscription} disabled={!operations.product.plan} onChange={()=>setSubscription(true)}/><span><strong>Your green rhythm <span className="plan-saving">DELIVERY PLAN</span></strong><small>Freshness on your selected schedule</small></span><b>{operations.product.subscriptionPrice>0?"₹"+operations.product.subscriptionPrice:"Unavailable"}</b></label></fieldset>
            <div className="purchase"><div className="quantity"><button aria-label="Decrease quantity" disabled={quantity===1} onClick={()=>setQuantity(Math.max(1,quantity-1))}>−</button><output aria-label="Quantity">{quantity}</output><button aria-label="Increase quantity" onClick={()=>setQuantity(quantity+1)}>+</button></div><button className="button green" disabled={!catalog.trayOfferReady||quantity*(operations.product.variant?.trays||1)>available} onClick={()=>{saveCart({quantity:Math.min(99,quantity+(previewCart.subscription===subscription&&previewCart.variantId===operations.product.variant?.id?cart:0)),subscription,variantId:operations.product.variant?.id,planId:subscription?operations.product.plan?.id:null});setCartOpen(true);}}>Add to cart <Icon name="arrow" size={22}/></button></div><p className="shipping-note"><Icon name="truck" size={18}/> Thoughtfully packed. Delivered with care.</p>{!operations.product.availabilityKnown&&<div className="storefront-availability-note"><p>For current availability and delivery options, talk to our team.</p><Link href="/contact" className="text-link">Ask about availability ↗</Link></div>}
          </div>
        </div>
        <div className="benefits">{[["leaf","Simply fresh","Pure, living greens"],["heart","A daily moment","Made for your morning"],["sprout","Naturally green","Grown with care"],["box","A little closer","From our farm to your home"]].map(([icon,title,label])=><div key={title}><span><Icon name={icon} size={25}/></span><div><strong>{title}</strong><small>{label}</small></div></div>)}</div>
      </Reveal>
      <Reveal as="section" className="farm-section" id="farm"><div className="section-wrap"><p className="eyebrow">A SHORT JOURNEY. A FRESHER START.</p><h2>From our farm <em>to your home.</em></h2><p className="section-description">Goodness you can trace, every step of the way.</p><div className="farm-steps">{[["sprout","01","We grow","Healthy seeds. Rich soil. A whole lot of care."],["sun","02","We harvest","Picked at their freshest, just for you."],["box","03","We pack","Thoughtfully packed to keep the goodness in."],["truck","04","We deliver","From our little farm to your front door."]].map(([icon,n,title,description],index)=><Reveal as="div" delay={index*0.1} className="farm-step" key={n}><div className="step-icon"><Icon name={icon} size={39}/><span>{n}</span></div><h3>{title}</h3><p>{description}</p></Reveal>)}</div><a className="button outline" href="#ritual">Discover the daily ritual <Icon name="arrow" size={17}/></a></div></Reveal>
      <Reveal as="section" className="ritual section-wrap" id="ritual"><Icon name="leaf" size={38}/><p className="eyebrow">ONE LITTLE HABIT. EVERY SINGLE DAY.</p><h2>Make room for <em>a little green.</em></h2><p>Snip fresh. Juice or blend. Enjoy as part of your morning routine.<br/>Simple ingredients. A fresh moment for yourself.</p><a href="#shop" className="text-link">Start your green ritual <span>↗</span></a></Reveal>
<Reveal as="section" className="commerce-subscriptions section-wrap" id="subscriptions"><p className="eyebrow">FRESHNESS, ON REPEAT</p><h2>Find your green rhythm.</h2><PlansList/></Reveal>
      <Reveal as="section" className="commerce-recipes section-wrap" id="recipes"><p className="eyebrow">YOUR MORNING, MADE GREEN</p><h2>Keep your ritual <em>simple.</em></h2><div className="recipe-grid"><article><span>01 / PREPARE</span><h3>Fresh wheatgrass juice</h3><p>Snip the fresh shoots above the roots, rinse thoroughly, and use a juicer suited to leafy greens. Follow your appliance instructions.</p></article><article><span>02 / MAKE IT YOURS</span><h3>A little green in your blend</h3><p>Blend rinsed wheatgrass with water and strain, or add freshly prepared juice to a fruit blend you already enjoy.</p></article></div></Reveal>
      <Reveal as="section" className="commerce-faq section-wrap" id="faq"><p className="eyebrow">A FEW THINGS TO KNOW</p><h2>Fresh questions.<br/><em>Simple answers.</em></h2><div>{[["What is included?","Choose your preferred tray quantity from the available product variants."],["Is this bottled juice?","No. You receive living wheatgrass trays to snip and prepare at home."],["Can I choose a subscription?","Available delivery plans appear on the product page. Manage your saved schedule in your account; future orders require separate confirmation."],["Do you deliver to my PIN code?","PIN-code coverage, delivery charges, dates and slots will be confirmed through the delivery checker once service areas are configured."],["Can I place an order now?","Choose an available product and delivery slot, sign in and complete checkout. Ordering opens when stock, delivery and payment settings are ready."]].map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></Reveal>
    </main>
    <SiteFooter/>
    <AnimatePresence>{cartOpen && <motion.div key="cart" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion ? 0 : 0.2}} className="cart-overlay" onClick={()=>setCartOpen(false)}><motion.section initial={{x:reducedMotion ? 0 : "100%"}} animate={{x:0}} exit={{x:reducedMotion ? 0 : "100%"}} transition={{duration:reducedMotion ? 0 : 0.35,ease:[0.22,1,0.36,1]}} role="dialog" aria-modal="true" aria-labelledby="cart-title" className="cart-panel" onClick={e=>e.stopPropagation()}><div className="cart-heading"><h2 id="cart-title">Your fresh picks</h2><button onClick={()=>setCartOpen(false)} aria-label="Close cart"><Icon name="close"/></button></div>{cart>0 ? <><div className="cart-item"><div style={{backgroundImage:`url(${grass})`}}/><div><h3>{operations.product.name}</h3><p>{cart} × {cartVariant?.name||"tray"} · 1.25 kg per tray</p><p>₹{cartTotal} <small>product subtotal</small></p></div></div><button className="remove" onClick={()=>{saveCart({quantity:0,subscription:false});}}>Remove items</button><p className="cart-notice">Your greens are in the bag. Review your basket and continue to secure checkout.</p></>:<p className="cart-notice">Your bag is waiting for a little green.</p>}<Link href="/cart" className="button green" onClick={()=>setCartOpen(false)}>Review basket ↗</Link><button className="button green" onClick={()=>setCartOpen(false)}>Continue shopping <Icon name="arrow" size={18}/></button></motion.section></motion.div>}</AnimatePresence>
  </>;
}











