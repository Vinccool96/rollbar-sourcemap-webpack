import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    coverage: {
      enabled: true,
      provider: "c8",
      all: true,
      src: ["./src"],
    },
  },
})
