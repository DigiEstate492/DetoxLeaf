/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.29.101", "192.168.29.197", "192.168.56.1"],
  async redirects() {
    return [
      { source: "/shop", destination: "/fresh-wheatgrass", permanent: true },
      { source: "/how-it-works", destination: "/our-farm", permanent: true },
      { source: "/account/rewards", destination: "/account", permanent: true },
      { source: "/admin/analytics", destination: "/admin", permanent: true },
      { source: "/admin/reports", destination: "/admin", permanent: true },
    ];
  },
};
export default nextConfig;
