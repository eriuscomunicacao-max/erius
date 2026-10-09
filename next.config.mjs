/** @type {import('next').NextConfig} */
const nextConfig = {
  optimizeFonts: false,
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // o sistema fica fora do Google; só a landing ("/" e "/lp") pode aparecer
        source: "/:path((?!lp).+)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};
export default nextConfig;
