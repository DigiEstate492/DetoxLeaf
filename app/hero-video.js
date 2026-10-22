"use client";
import { useEffect, useRef, useState } from "react";
export default function HeroVideo() {
  const video = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = video.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    element.muted = true;
    element.defaultMuted = true;
    const sync = () => {
      if (preference.matches) element.pause();
      else element.play().catch(() => setPlaying(false));
    };
    sync();
    element.addEventListener("canplay", sync);
    if (preference.addEventListener) preference.addEventListener("change", sync);
    else preference.addListener(sync);
    return () => {
      element.removeEventListener("canplay", sync);
      if (preference.removeEventListener) preference.removeEventListener("change", sync);
      else preference.removeListener(sync);
      element.pause();
    };
  }, []);
  const toggle = () => {
    const element = video.current;
    if (element.paused) {
      element.muted = true;
      if (failed) { setFailed(false); element.load(); }
      element.play().catch(() => setPlaying(false));
    } else element.pause();
  };
  return <>
    <video ref={video} className="hero-video" muted loop playsInline preload="metadata" poster="/media/grass-poster.jpg" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => {setFailed(true);setPlaying(false);}} aria-hidden="true" tabIndex={-1}><source src="/media/grass-breeze.mp4" type="video/mp4"/></video>
    <button className="video-toggle" onClick={toggle} aria-label={playing ? "Pause background video" : "Play background video"}><span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span><span>{failed ? "Retry film" : playing ? "Pause film" : "Play film"}</span></button>
  </>;
}
