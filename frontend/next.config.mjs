/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker containerization, disable on Vercel
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
