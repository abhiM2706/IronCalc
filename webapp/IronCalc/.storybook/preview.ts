import type { Preview } from "@storybook/react";
import { init } from "../src/index";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  loaders: [
    async () => {
      await init();
      return {};
    },
  ],
};

export default preview;
