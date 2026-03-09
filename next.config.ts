import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // reactCompiler: true, // Disabled for now
  
  async redirects() {
    return [
      {
        source: '/report',
        destination: '/vision',
        permanent: false, // [THỢ RÈN] Cấm dùng 308. Mở đường lui cho việc scale module Report sau này.
      },
    ];
  },
};

export default nextConfig;
