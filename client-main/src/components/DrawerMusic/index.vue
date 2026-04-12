<script setup lang="ts">
import Left from './left.vue'
import Right from './right.vue'
import { useDark, useToggle } from '@vueuse/core'
import { useDateFormat, useNow } from '@vueuse/core'
import { getSongDetail } from '@/api/system'
import type { SongDetail } from '@/api/interface'
import { ref, provide } from 'vue'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { themeStore } from '@/stores/modules/theme'

const formatted = useDateFormat(useNow(), 'HH:mm:ss')
const theme = themeStore()
const showDrawer = defineModel<boolean>()
const songDetail = ref<SongDetail | null>(null)

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
const { currentTrack } = useAudioPlayer()

// 监听 currentTrack 的变化，获取歌曲详情
watch(() => currentTrack.value.id, async (newId) => {
  if (newId) {
    try {
      const res = await getSongDetail(Number(newId))
      if (res.code === 0 && res.data) {
        // 确保返回的数据符合 SongDetail 接口
        const songData = res.data as unknown as SongDetail
        if (
          'songId' in songData &&
          'songName' in songData &&
          'artistName' in songData &&
          'album' in songData
        ) {
          songDetail.value = songData
        } else {
          console.error('歌曲详情数据格式不正确')
        }
      }
    } catch (error) {
      console.error('获取歌曲详情失败:', error)
    }
  }
}, { immediate: true })

// 提供 songDetail 给子组件
provide('songDetail', songDetail)
</script>
<template>
  <el-drawer :style="{
    '--track-cover-url': `url(${currentTrack.cover})`,
  }" v-model="showDrawer" direction="btt" size="100%" :modal="false" :showClose="false"
    class="spotify-glass-drawer">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center justify-center gap-2 text-primary-foreground">
          <el-button text circle @click="showDrawer = false">
            <icon-uiw:down />
          </el-button>
        </div>
        <div class="flex items-center gap-1">
          <icon-meteor-icons:clock />
          <span class="text-base"> {{ formatted }} </span>
        </div>
      </div>
    </template>
    <main class="flex h-full">
      <div class="flex w-full flex-1">
        <div class="w-1/2">
          <Left />
        </div>
        <div class="w-1/2 relative">
          <Right />
        </div>
      </div>
    </main>
    <template #footer>

    </template>
  </el-drawer>
</template>

<style scoped>
.drawer-bg {
  background-image: var(--track-cover-url);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.drawer-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  z-index: -1;
}
</style>

<style>
/* 🌟 全屏播放页专属毛玻璃狙击 */
.spotify-glass-drawer {
  /* 稍微深一点的黑，让专辑封面更显色 */
  background: rgba(20, 20, 20, 0.75) !important; 
  /* 播放页需要更强烈的模糊感 */
  backdrop-filter: blur(30px) !important; 
  -webkit-backdrop-filter: blur(30px) !important;
  /* 播放页通常从底部弹起，只需要顶部有一条若隐若现的高光反光线 */
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 强制抽屉内部背景彻底透明，让毛玻璃质感透出来 */
.spotify-glass-drawer .el-drawer__body,
.spotify-glass-drawer .el-drawer__header {
  background: transparent !important;
}

/* 如果你的抽屉有自带的标题和关闭按钮，顺手把它们调成 Spotify 灰绿风格 */
.spotify-glass-drawer .el-drawer__title {
  color: #ffffff !important;
}
.spotify-glass-drawer .el-drawer__headerbtn .el-drawer__close {
  color: #b3b3b3 !important;
  font-size: 24px !important;
}
.spotify-glass-drawer .el-drawer__headerbtn:hover .el-drawer__close {
  color: #1DB954 !important;
  transform: scale(1.1);
}
</style>