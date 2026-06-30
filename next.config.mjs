/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal standalone server bundle — ideal for the Railway Docker image.
  output: "standalone",
  reactStrictMode: true,
  // Keep the postgres driver out of the bundler so it loads as a normal CJS module.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
