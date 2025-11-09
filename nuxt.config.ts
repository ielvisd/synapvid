// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  modules: ['@nuxt/ui', '@tresjs/nuxt'],
  
  css: ['~/assets/css/main.css'],
  
  runtimeConfig: {
    // Private keys (only available server-side)
    openaiApiKey: process.env.OPENAI_API_KEY,
    // Public keys (exposed to client)
    public: {}
  },
  
  typescript: {
    strict: true,
    typeCheck: false // Temporarily disabled to avoid vite-plugin-checker issues
  },
  
  // SSR configuration to prevent useHead recursion issues
  ssr: true,
  
  // Nuxt UI configuration
  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
      transitions: true
    }
  },
  
  // Vite configuration to deduplicate Three.js instances
  // This ensures TresJS and direct Three.js imports use the same instance
  // Prevents "Multiple instances of Three.js" warning and reduces bundle size
  vite: {
    resolve: {
      dedupe: ['three']
    },
    optimizeDeps: {
      include: ['three']
    }
  }
})

