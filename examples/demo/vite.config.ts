import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Resolve the package to its SOURCE so the demo runs before publishing.
const src = (p: string) => resolve(__dirname, "../../src", p);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "vardhan-maps/react": src("react/index.ts"),
      "vardhan-maps/data": src("data/index.ts"),
      "vardhan-maps/svg": src("svg/index.ts"),
      "vardhan-maps": src("index.ts"),
    },
  },
  server: { port: 5173 },
});
