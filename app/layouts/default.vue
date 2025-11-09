<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header Navigation -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <UContainer>
        <div class="flex items-center justify-between h-16">
          <NuxtLink to="/" class="text-2xl font-bold text-primary">
            SynapVid
          </NuxtLink>
          <nav class="flex gap-6">
            <NuxtLink to="/" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Home
            </NuxtLink>
            <NuxtLink to="/editor" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Editor
            </NuxtLink>
            <NuxtLink to="/preview" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Preview
            </NuxtLink>
            <NuxtLink to="/export" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Export
            </NuxtLink>
          </nav>
        </div>
      </UContainer>
    </header>

    <!-- Main Content -->
    <main class="py-8">
      <UContainer>
        <slot />
      </UContainer>
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <UContainer>
        <div class="py-6 text-center text-sm text-gray-600 dark:text-gray-400">
          SynapVid - Educational Video Generation Pipeline
        </div>
      </UContainer>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Default layout with navigation
// Uses Nuxt UI UContainer component - discovered via nuxt-ui MCP
</script>

