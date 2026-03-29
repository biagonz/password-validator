import { NextFederationPlugin } from "@module-federation/nextjs-mf";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config, { isServer, webpack }) {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^node:/,
        (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        },
      ),
    );

    config.resolve.fallback = {
      ...config.resolve.fallback,
      module: false,
      fs: false,
      path: false,
      os: false,
    };

    if (!isServer) {
      config.plugins.push(
        new NextFederationPlugin({
          name: "mfePassword",
          filename: "static/chunks/remoteEntry.js",
          exposes: {
            "./PasswordValidator": "./src/components/PasswordValidator/PasswordValidator.tsx",
          },
          shared: {
            react: { singleton: true, requiredVersion: false },
            "react-dom": { singleton: true, requiredVersion: false },
          },
          extraOptions: {},
        }),
      );
    }

    return config;
  },
};

export default nextConfig;
