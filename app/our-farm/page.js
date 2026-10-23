import Link from "next/link";
import Image from "next/image";
import CustomerShell from "../customer-shell";
export const metadata = {
  title: "Rooted in nature | Detoxleaf",
  description: "A closer look at the journey behind your fresh greens.",
};
export default function Page() {
  return (
    <CustomerShell
      title="Rooted in nature."
      accent="Grown with care."
      description="A closer look at the journey behind your fresh greens."
    >
      <div className="farm-feature">
        <Image
          src="/media/grass-poster.jpg"
          alt="Grass blades moving in natural light"
          width={1200}
          height={650}
        />
        <div>
          <p className="eyebrow">FROM SEED TO YOUR RITUAL</p>
          <h2>Goodness has a journey.</h2>
          <p>
            Our farm journey brings growing, harvesting, packing and delivery
            together. The planned batch system will connect each harvest with
            the orders it supplies.
          </p>
          <Link href="/how-it-works" className="button green">
            Follow the journey ↗
          </Link>
        </div>
      </div>
      <div className="info-grid">
        <article>
          <h3>Grow</h3>
          <p>
            A considered start with seeds and a fresh-produce growing cycle.
          </p>
        </article>
        <article>
          <h3>Harvest & pack</h3>
          <p>
            Freshness guides the journey from the growing tray to the delivery
            pack.
          </p>
        </article>
        <article>
          <h3>Trace each batch</h3>
          <p>
            Planting, harvesting and order allocations will be recorded as
            operations go live.
          </p>
        </article>
      </div>
    </CustomerShell>
  );
}
