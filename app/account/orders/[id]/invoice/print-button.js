"use client";
// Browsers save the printed page as a PDF ("Save as PDF" in the print dialog).
export default function PrintButton(){return <button type="button" className="button green" onClick={()=>window.print()}>Download PDF / Print ↗</button>;}
