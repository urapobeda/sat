import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(".")
  },
  devIndicators: {
    position: "bottom-right"
  }
};

export default nextConfig;
