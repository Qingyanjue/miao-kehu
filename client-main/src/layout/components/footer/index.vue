<script setup lang="ts">
import Left from './components/left.vue'
import Center from './components/center.vue'
import Right from './components/right.vue'
</script>
<template>
  <footer class="bg-black flex items-center justify-between h-20 px-2 border-t border-[#282828] z-50">
    <!-- 左边：歌曲封面和歌曲名称 -->
    <Left />
    <!-- 中间：控制区 -->
    <Center />
    <!-- 右边：历史播放和音量 -->
    <Right />
  </footer>
</template>
