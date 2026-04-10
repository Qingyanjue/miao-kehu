<template>
  <main class="flex-1 overflow-y-auto bg-background m-2 rounded-lg">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </main>
</template>
