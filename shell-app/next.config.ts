import { NextFederationPlugin } from "@module-federation/nextjs-mf";
import type { NextConfig } from "next";
import type { ExternalItemFunctionData } from "webpack";

const nextConfig: NextConfig = {
  output: "export",
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

    if (isServer) {
      const existingExternals = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(existingExternals)
          ? existingExternals
          : [existingExternals]),
        async ({ request }: ExternalItemFunctionData) => {
          if (request?.startsWith("mfePassword/")) {
            return `commonjs ${request}`;
          }
        },
      ];
    }

    if (!isServer) {
      config.plugins.push(
        new NextFederationPlugin({
          name: "shellApp",
          filename: "static/chunks/remoteEntry.js",
          remotes: {
            mfePassword: `mfePassword@${process.env.NEXT_PUBLIC_MFE_PASSWORD_URL ?? "http://localhost:3002"}/_next/static/chunks/remoteEntry.js`,
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
