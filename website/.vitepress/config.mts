import { defineConfig } from "vitepress";

// Project Pages site → served under /vardhan-maps/.
export default defineConfig({
  title: "vardhan-maps",
  description:
    "Standard, GoI-aligned India map for React — all 36 states/UTs + 787 districts as GeoJSON, with SVG, Leaflet/MapLibre & React Native renderers and a self-hosted OpenStreetMap vector basemap.",
  lang: "en-US",
  base: "/vardhan-maps/",
  lastUpdated: true,
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", href: "/vardhan-maps/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#2563eb" }],
    ["meta", { property: "og:title", content: "vardhan-maps" }],
    [
      "meta",
      {
        property: "og:description",
        content: "A GoI-aligned India map for React — states, districts, and a self-hosted vector basemap.",
      },
    ],
    ["meta", { property: "og:image", content: "https://vardhan-systems.github.io/vardhan-maps/hero.png" }],
  ],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Vector basemap", link: "/guide/vector-basemap" },
      {
        text: "0.21.0",
        items: [
          { text: "npm", link: "https://www.npmjs.com/package/vardhan-maps" },
          { text: "Changelog", link: "https://github.com/Vardhan-Systems/vardhan-maps/blob/main/CHANGELOG.md" },
          { text: "Roadmap", link: "https://github.com/Vardhan-Systems/vardhan-maps/blob/main/ROADMAP.md" },
        ],
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Live demo", link: "/guide/live-demo" },
          ],
        },
        {
          text: "Usage",
          items: [
            { text: "The data (GeoJSON)", link: "/guide/data" },
            { text: "SVG renderer", link: "/guide/svg" },
            { text: "React (Leaflet)", link: "/guide/react" },
            { text: "Vector basemap", link: "/guide/vector-basemap" },
            { text: "React Native", link: "/guide/react-native" },
            { text: "AI map spec", link: "/guide/spec" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/Vardhan-Systems/vardhan-maps" },
      { icon: "npm", link: "https://www.npmjs.com/package/vardhan-maps" },
    ],
    search: { provider: "local" },
    editLink: {
      pattern: "https://github.com/Vardhan-Systems/vardhan-maps/edit/main/website/:path",
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "Code MIT · Map data ODbL (© OpenStreetMap contributors)",
      copyright: "© Vardhan Systems",
    },
  },
  // Leaflet / MapLibre are browser-only; the demo components import them inside
  // onMounted, so SSR never touches them. Keep vardhan-maps un-externalized so its
  // ESM data chunks resolve during the client build.
  vite: {
    ssr: { noExternal: ["vardhan-maps"] },
  },
});
