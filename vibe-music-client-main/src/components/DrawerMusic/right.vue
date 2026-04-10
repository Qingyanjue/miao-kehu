<script setup lang="ts">
import type { SongDetail } from '@/api/interface'
import { ref, inject, type Ref, computed , watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { formatNumber } from '@/utils'
import coverImg from '@/assets/cover.png'
import { likeComment, addSongComment, getSongDetail, deleteComment } from '@/api/system'
import { ElMessage } from 'element-plus'
import { UserStore } from '@/stores/modules/user'

const songDetail = inject<Ref<SongDetail | null>>('songDetail')
const userStore = UserStore()



// 获取当前用户名
const currentUsername = computed(() => userStore.userInfo?.username || '')

// 评论相关
const commentContent = ref('')
const maxLength = 180

// 对评论进行排序，最新的显示在前面
const comments = computed(() => {
  if (!songDetail.value?.comments) return []
  return [...songDetail.value.comments].sort((a, b) => b.commentId - a.commentId)
})

// 发布评论
const handleComment = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }

  if (!commentContent.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  
  try {
    const songId = songDetail.value?.songId
    if (!songId) return
    
    const content = commentContent.value.trim()
    const res = await addSongComment({
      songId,
      content
    })
    
    if (res.code === 0) {
      ElMessage.success('评论发布成功')
      commentContent.value = ''
      // 重新获取歌曲详情以更新评论列表
      const detailRes = await getSongDetail(songId)
      if (detailRes.code === 0 && detailRes.data) {
        songDetail.value = detailRes.data as unknown as SongDetail
      }
    } else {
      ElMessage.error('评论发布失败')
    }
  } catch (error) {
    ElMessage.error('评论发布失败')
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 处理点赞
const handleLike = async (comment: any) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }

  try {
    // 调用点赞接口
    const res = await likeComment(comment.commentId)
    if (res.code === 0) {
      // 更新评论的点赞数量
      if (songDetail.value && songDetail.value.comments) {
        const updatedComments = songDetail.value.comments.map(item => {
          if (item.commentId === comment.commentId) {
            return {
              ...item,
              likeCount: item.likeCount + 1
            }
          }
          return item
        })
        
        songDetail.value = {
          ...songDetail.value,
          comments: updatedComments
        }
      }

      ElMessage.success('点赞成功')
    }
  } catch (error) {
    ElMessage.error('点赞失败')
  }
}

// 删除评论
const handleDelete = async (comment: any) => {
  try {
    const res = await deleteComment(comment.commentId)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      // 重新获取歌曲详情以更新评论列表
      const songId = songDetail.value?.songId
      if (songId) {
        const detailRes = await getSongDetail(songId)
        if (detailRes.code === 0 && detailRes.data) {
          songDetail.value = detailRes.data as unknown as SongDetail
        }
      }
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

// 1. 获取图表容器
const chartRef = ref<HTMLElement | null>(null)
let myChart: echarts.ECharts | null = null

//  1. 毕设核心算法：构建我们自己的本地“情感词典”
const sentimentDict = {
  positive: {
    // 各种层次的高级绿、薄荷绿、翠绿
    colors: ['#1DB954', '#1ed760', '#1aa34a', '#22c55e', '#10b981', '#34d399', '#059669'],
    words: ['喜欢', '好听', '绝了', '爱', '神仙', '单曲循环', '开心', '治愈', '温柔', '感动', '好棒', '舒服', '宝藏', '惊艳']
  },
  negative: {
    // 各种层次的忧郁紫、科技蓝、靛蓝
    colors: ['#818CF8', '#6366F1', '#A78BFA', '#8B5CF6', '#93C5FD', '#60A5FA', '#4F46E5'],
    words: ['难过', '哭', '悲伤', '心碎', '遗憾', '难听', '失望', '刺耳', '烦', '痛苦', '落泪', '抑郁', '可惜']
  },
  neutral: {
    // 各种层次的冷感灰、蓝灰、银灰
    colors: ['#64748B', '#94A3B8', '#475569', '#cbd5e1', '#a1a1aa', '#71717a', '#52525b'],
    words: ['旋律','随机', '歌词', '节奏', '编曲', '声音', '嗓音', '前奏', '吉他', '钢琴', '和声', '回忆', '故事', '感觉']
  }
}

//  2. 监听评论数据并运行本地 NLP 分析
watch(() => comments.value, async (newComments) => {
  await nextTick()
  // 无论有没有评论，都要确保拿到图表实例
  if (!myChart && chartRef.value) {
    myChart = echarts.init(chartRef.value)
  }

  //  修复点：如果当前歌曲没有评论
  if (!newComments || newComments.length === 0) {
    myChart?.clear() // 第一步：清空上一首歌遗留的所有气泡
    myChart?.setOption({ // 第二步：在图表正中间写上提示语
      backgroundColor: 'transparent',
      title: {
        text: '暂无评论，快去发布第一条评论吧~',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#64748B', // 高级灰蓝色，不刺眼
          fontSize: 14,
          fontWeight: 'normal'
        }
      }
    })
    return // 提示写完后，结束运行
  }
  // --- 本地 NLP 关键词词频统计算法开始 ---
  // 把当前这首歌的所有评论拼成一段长文本
  const allCommentsText = newComments.map(c => c.content).join(' ')
  
  const wordFrequency: any[] = []

  // 遍历我们的词典，统计每个词在评论中出现的次数
  Object.keys(sentimentDict).forEach((sentimentType) => {
    const typeKey = sentimentType as keyof typeof sentimentDict
    const { words, colors } = sentimentDict[typeKey]
    
    words.forEach(word => {
      // 用正则匹配这个词在长文本中出现了几次
      const regex = new RegExp(word, 'g')
      const matches = allCommentsText.match(regex)
      const count = matches ? matches.length : 0
      
      // 如果出现了，就加入到我们的数据中
      if (count > 0) {
        //  核心魔法：从该情感的调色盘中，随机抽取一个颜色
        const randomColor = colors[Math.floor(Math.random() * colors.length)]

        wordFrequency.push({
          name: word,
          count: count,
          sentiment: typeKey,
          color: randomColor
        })
      }
    })
  })

  // 按出现次数从大到小排序，只取前 15 个高频词来画气泡，免得太乱
  wordFrequency.sort((a, b) => b.count - a.count)
  const topWords = wordFrequency.slice(0, 15)
  // --- 本地 NLP 算法结束 ---

// 如果虽然有评论，但是大家都没说到咱们词典里的词（提取结果为空）
  if (topWords.length === 0) {
    myChart?.clear()
    myChart?.setOption({
      backgroundColor: 'transparent',
      title: {
        text: '暂未提取到明显的情感倾向',
        left: 'center',
        top: 'center',
        textStyle: { color: '#64748B', fontSize: 14, fontWeight: 'normal' }
      }
    })
    return
  }

  //  3. 生成 ECharts 气泡图的数据格式
  const bubbleData = topWords.map(item => {
    return {
      name: item.name,
      // value: [x坐标, y坐标, 实际频次] （我们用随机数打散 x 和 y，形成悬浮气泡效果）
      value: [Math.random() * 100, Math.random() * 100, item.count],
      // 气泡大小：基础大小 20 + 频次倍数（如果基数小可以把倍数调大，比如 * 5）
      symbolSize: 20 + (item.count * 8), 
      itemStyle: {
        color: item.color,
        opacity: 0.8,
        shadowBlur: 10,
        shadowColor: item.color
      },
      label: {
        show: true,
        formatter: '{b}', // 只显示文字
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14
      }
    }
  })

// 重点：在画新气泡之前，先清理掉可能的旧提示语和旧气泡
  myChart?.clear()

  //  4. 渲染气泡图
  myChart?.setOption({
    backgroundColor: 'transparent',
    // 隐藏坐标轴，让气泡悬浮在空中
    xAxis: { show: false, min: -10, max: 110 }, 
    yAxis: { show: false, min: -10, max: 110 },
    tooltip: {
      formatter: function (params: any) {
        // 鼠标移上去时显示：关键词 : 出现次数
        return `${params.data.name} : 提及 ${params.data.value[2]} 次`
      },
      backgroundColor: '#121212',
      borderColor: '#333',
      textStyle: { color: '#fff' }
    },
    series: [{
      type: 'scatter', // 散点图/气泡图
      data: bubbleData,
      // 给气泡加上炫酷的出场动画
      animationDelay: function (idx: number) {
        return idx * 100 // 每个气泡延迟 100ms 依次弹出
      }
    }]
  })

}, { immediate: true, deep: true })

// 监听窗口大小变化，让图表自适应
window.addEventListener('resize', () => {
  myChart?.resize()
})
</script>

<template>
  <div class="h-full p-6 overflow-y-auto mr-16">
    <div v-if="songDetail" class="space-y-6">
      <!-- 歌曲信息 -->
      <div class="space-y-2">
        <h3 class="text-xl font-semibold text-primary-foreground">歌曲信息</h3>
        <div class="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <span class="text-primary-foreground">专辑：</span>
            {{ songDetail.album }}
          </div>
          <div>
            <span class="text-primary-foreground">发行时间：</span>
            {{ formatDate(songDetail.releaseTime) }}
          </div>
        </div>
      </div>

      <!-- 评论区 -->
      <div class="space-y-4">
        <h3 class="text-xl font-semibold text-primary-foreground mt-12">评论（{{ formatNumber(songDetail.comments?.length || 0) }}）</h3>
        <div class="mt-6 mb-4">
          <span class="text-lg font-bold">评论区情感分析</span>
        </div>

        <div ref="chartRef" class="w-full h-52 mb-6"></div>
        <!-- 评论输入框 -->
        <div class="mb-4">
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <el-input
                v-model="commentContent"
                type="textarea"
                :rows="4"
                :maxlength="maxLength"
                placeholder="说点什么吧"
                resize="none"
                show-word-limit
              />
              <div class="flex justify-end items-center mt-4">
                <button @click="handleComment" :disabled="!commentContent.trim()"
                  class="px-6 py-1.5 bg-primary text-white rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors">
                  发布
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 评论列表 -->
        <div v-if="comments.length > 0" class="space-y-4">
          <template v-for="comment in comments" :key="comment.commentId">
            <div class="flex gap-3 group">
              <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                <img :src="comment.userAvatar || coverImg" alt="avatar" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-blue-500">{{ comment.username }}</span>
                </div>
                <p class="text-sm mt-1 mb-2">{{ comment.content }}</p>
                <div class="flex items-center justify-between text-sm text-gray-400">
                  <span class="text-xs">{{ comment.createTime }}</span>
                  <div class="flex items-center gap-4">
                    <!-- 如果是用户自己的评论，显示删除按钮 -->
                    <button v-if="comment.username === currentUsername"
                      class="flex items-center gap-1 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      @click="handleDelete(comment)"
                    >
                      <icon-material-symbols:delete-outline />
                      <span>删除</span>
                    </button>
                    <button 
                      class="flex items-center gap-1 hover:text-gray-600"
                      @click="handleLike(comment)"
                    >
                      <span>{{ formatNumber(comment.likeCount) }}</span>
                      <icon-material-symbols:thumb-up />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="border-b border-gray-300/70"></div>
          </template>
        </div>
        <div v-else class="text-center py-8 text-gray-500">
          <p>暂无评论，快来抢沙发吧~</p>
        </div>
      </div>
    </div>
    <div v-else class="flex items-center justify-center h-full">
      <el-empty description="暂无歌曲信息" />
    </div>
  </div>
</template>

<style scoped>
.el-button {
  --el-button-hover-text-color: var(--el-color-primary);
  --el-button-hover-bg-color: transparent;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-textarea__inner) {
  border-radius: 12px !important;
}
</style>
