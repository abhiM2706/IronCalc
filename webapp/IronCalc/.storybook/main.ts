import type { StorybookConfig } from "@storybook/react-vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@chromatic-com/storybook",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: (config) => {
    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins.push(wasm());
    config.plugins.push(topLevelAwait());

    if (!config.server) {
      config.server = {};
    }
    if (!config.server.fs) {
      config.server.fs = {};
    }
    config.server.fs.allow = ["../.."];

    // Add WASM support
    config.optimizeDeps = {
      ...config.optimizeDeps,
      exclude: ["@ironcalc/wasm"],
    };

    return config;
  }
};
export default config;
