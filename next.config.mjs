/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal standalone server bundle — ideal for the Railway Docker image.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
