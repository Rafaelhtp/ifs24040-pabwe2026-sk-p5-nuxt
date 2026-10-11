import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { deferNuxtCss } from "./server/utils/deferCss";

const customPort = Number(process.env.APP_PORT || process.env.PORT) || 3000;

const delcomBaseUrl = process.env.VITE_DELCOM_BASEURL || "https://open-api.delcom.org/api/v1";

// Browser memanggil Delcom langsung. Bila gagal (CORS/jaringan), request otomatis diulang lewat
// proxy same-origin (server/api/delcom/[...path].ts). Isi VITE_DELCOM_PROXY=true lalu build ulang
// bila proxy ingin dijadikan jalur utama.
const useProxyFirst = process.env.VITE_DELCOM_PROXY === "true";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },
  telemetry: false,

  // SPA mode: SSR dimatikan karena aplikasi bergantung pada storage browser
  ssr: false,

  // Sumber aplikasi berada di direktori src/
  srcDir: "src/",

  // Aktifkan vue-router; daftar rute diambil dari src/router.options.ts
  pages: true,

  css: ["~/index.css"],

  modules: ["@pinia/nuxt"],

  hooks: {
    // Paksa Nuxt memakai src/App.vue sebagai root component
    "app:resolve"(app) {
      app.rootComponent = fileURLToPath(new URL("./src/App.vue", import.meta.url));
    },
  },

  vite: {
    plugins: [tailwindcss()],
    define: {
      DELCOM_BASEURL: JSON.stringify(useProxyFirst ? "/api/delcom" : delcomBaseUrl),
      DELCOM_PROXY_BASEURL: JSON.stringify("/api/delcom"),
      DELCOM_ORIGIN: JSON.stringify(new URL(delcomBaseUrl).origin),
    },
    build: {
      rollupOptions: {
        output: {
          // Server hosting memakai HTTP/1.1 (maks. ~6 koneksi paralel), jadi puluhan chunk kecil justru
          // memperlambat muat awal. Semua kode digabung ke satu chunk agar jumlah request minimal.
          manualChunks: () => "app",
        },
      },
    },
  },

  devServer: {
    port: customPort,
  },

  // Header cache dibuka supaya halaman bisa dipulihkan lewat back/forward cache (bfcache).
  routeRules: {
    "/": { headers: { "cache-control": "public, max-age=0, must-revalidate" } },
    "/auth/**": { headers: { "cache-control": "public, max-age=0, must-revalidate" } },
    "/_nuxt/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
  },

  nitro: {
    devPort: customPort,
    // Kompres aset publik (JS/CSS/HTML) saat build; server menyajikan versi gzip/brotli sesuai Accept-Encoding.
    compressPublicAssets: { gzip: true, brotli: true },
    hooks: {
      // Berlaku untuk HTML hasil prerender (200.html / index.html)
      "prerender:generate"(route) {
        if (typeof route.contents === "string" && route.fileName?.endsWith(".html")) {
          route.contents = deferNuxtCss(route.contents);
        }
      },
    },
    externals: {
      inline: ["@vue/shared"],
    },
  },

  app: {
    head: {
      title: "Delcom Cash Flow",
      htmlAttrs: {
        lang: "id",
      },
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        // Font dimuat tanpa memblokir render: diawali media=print lalu diaktifkan setelah selesai diunduh
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap",
          media: "print",
          onload: "this.media='all'",
        },
      ],
      meta: [
        {
          name: "description",
          content:
            "Delcom Cash Flow: aplikasi pencatat arus kas pribadi untuk memantau pemasukan, pengeluaran, tabungan, dan pinjaman.",
        },
      ],
      noscript: [
        {
          innerHTML:
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap">',
        },
      ],
      // CSS kritis minimal supaya layar tidak berkedip putih sebelum stylesheet utama termuat
      style: [{ innerHTML: "body{background-color:#f5f5f4;color:#0f172a}" }],
      bodyAttrs: {
        class: "bg-stone-100 text-slate-900 font-sans antialiased min-h-screen",
      },
    },
  },
});