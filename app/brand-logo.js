import Image from "next/image";
import Link from "next/link";
export default function BrandLogo() {
  return <Link href="/" className="brand-logo" aria-label="Detoxleaf home"><Image src="/brand/detoxleaf-logo-clear.png" alt="Detoxleaf — Pure Wellness From Nature" width={1254} height={1254} priority/><span>Detoxleaf<small>Pure Wellness From Nature</small></span></Link>;
}


