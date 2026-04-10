<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Avatar from './components/avatar.vue'
const route = useRoute()
const router = useRouter()
const currentIcon = ref('material-symbols:wb-sunny-outline-rounded')
const theme = themeStore()
import { useDark, useToggle } from '@vueuse/core'

const searchText = ref('')

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: 'light',
})
const toggleDark = useToggle(isDark)

const toggleMode = () => {
  theme.setDark(!isDark.value)
  toggleDark()
}

// 初始化时根据 store 设置图标
watch(
  () => theme.isDark,
  (newValue) => {
    currentIcon.value = newValue
      ? 'mdi:weather-night'
      : 'material-symbols:wb-sunny-outline-rounded'
  },
  { immediate: true }
)

// 赋值到搜索框
watch(
  () => route.query,
  (newValue) => {
    if (newValue.query) {
      searchText.value = newValue.query as string
    }
  },
  { immediate: true }
)
</script>
<template>
  <header class="px-4 py-2 flex items-center bg-transparent border-b border-[#282828]">
    <button class="flex relative w-60" @click="router.push('/')">
      <img src="\logo.svg" alt="logo" class="w-10 h-10 ml-2" />
      <span class="ml-3 text-2xl font-bold flex justify-center items-center"
        >妙音</span
      >
    </button>
    <!-- 输入框和头像 -->
    <div class="flex items-center gap-3">
      <div class="relative mr-6">
        <Icon
          icon="mdi:magnify"
          class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl"
        />
        <input
          v-model="searchText"
          type="text"
          class="mt-0.5 w-64 text-sm pl-8 pr-2 py-2 rounded-full bg-[#242424] text-white border border-transparent hover:border-[#444] focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 focus:w-80"
          placeholder="搜索..."
          @keyup.enter="router.push('/library?query=' + searchText)"
        />
      </div>
    </div>
    <div class="ml-auto flex items-center gap-3"><Avatar /></div>
  </header>
</template>


