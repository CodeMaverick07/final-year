/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "sanskriti-major-project.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "sanskriti-major-project.s3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
