import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler: true, // Disabled for now
  
  async redirects() {
    return [
      {
        source: '/report',
        destination: '/vision',
        permanent: true, // 308 permanent redirect
      },
    ];
  },
};

export default nextConfig;
