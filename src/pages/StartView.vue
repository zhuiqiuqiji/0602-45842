<template>
  <div class="start-view">
    <div class="start-bg">
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
      <div class="cloud cloud-3"></div>
    </div>

    <div class="start-content">
      <div class="title-section">
        <h1 class="game-title">
          <span class="title-char" style="--i:0">跳</span>
          <span class="title-char" style="--i:1">皮</span>
          <span class="title-char" style="--i:2">筋</span>
        </h1>
        <p class="game-subtitle">经典童年 · 花样过级</p>
        <div class="rubber-band-anim">
          <div class="band-line"></div>
        </div>
      </div>

      <div class="mode-section">
        <p class="section-label">选择模式</p>
        <div class="mode-grid">
          <button class="mode-card" @click="goMode('classic')">
            <span class="mode-icon">🎮</span>
            <span class="mode-name">经典过级</span>
            <span class="mode-desc">8关逐级挑战</span>
          </button>
          <button class="mode-card" @click="goMode('routine')">
            <span class="mode-icon">📜</span>
            <span class="mode-name">传统套路</span>
            <span class="mode-desc">小马过河等</span>
          </button>
          <button class="mode-card" @click="goMode('multiplayer')">
            <span class="mode-icon">👥</span>
            <span class="mode-name">多人轮流</span>
            <span class="mode-desc">2-4人对战</span>
          </button>
          <button class="mode-card" @click="goMode('tutorial')">
            <span class="mode-icon">📖</span>
            <span class="mode-name">分步教学</span>
            <span class="mode-desc">从零学起</span>
          </button>
          <button class="mode-card" @click="goMode('editor')">
            <span class="mode-icon">✏️</span>
            <span class="mode-name">花样编辑</span>
            <span class="mode-desc">自定义套路</span>
          </button>
          <button class="mode-card" @click="goMode('competition')">
            <span class="mode-icon">🏆</span>
            <span class="mode-name">在线比赛</span>
            <span class="mode-desc">挑战排行</span>
          </button>
        </div>
      </div>

      <div v-if="selectedMode === 'classic' || selectedMode === 'routine' || selectedMode === 'multiplayer'" class="difficulty-section">
        <p class="section-label">选择难度</p>
        <div class="difficulty-options">
          <button
            v-for="d in difficulties"
            :key="d.value"
            class="diff-btn"
            :class="{ selected: selectedDifficulty === d.value }"
            :style="{ '--diff-color': d.color }"
            @click="selectedDifficulty = d.value"
          >
            <span class="diff-icon">{{ d.icon }}</span>
            <span class="diff-name">{{ d.name }}</span>
            <span class="diff-desc">{{ d.desc }}</span>
          </button>
        </div>
      </div>

      <div v-if="selectedMode === 'routine'" class="routine-section">
        <p class="section-label">选择套路</p>
        <div class="routine-grid">
          <button
            v-for="r in routineList"
            :key="r.id"
            class="routine-card"
            :class="{ selected: selectedRoutine === r.id }"
            @click="selectedRoutine = r.id"
          >
            <span class="routine-name">{{ r.name }}</span>
            <span class="routine-origin">{{ r.origin }}</span>
            <span class="routine-height">{{ r.heightLabel }}</span>
          </button>
        </div>
      </div>

      <div v-if="selectedMode === 'multiplayer'" class="multiplayer-section">
        <p class="section-label">玩家人数</p>
        <div class="player-options">
          <button
            v-for="n in [2, 3, 4]"
            :key="n"
            class="player-btn"
            :class="{ selected: playerCount === n }"
            @click="playerCount = n"
          >
            {{ n }}人
          </button>
        </div>
      </div>

      <div class="controls-section">
        <p class="section-label">操作说明</p>
        <div class="controls-grid">
          <div v-for="action in actionList" :key="action.type" class="control-card" :style="{ '--card-color': action.color }">
            <span class="ctrl-icon">{{ action.icon }}</span>
            <span class="ctrl-name">{{ action.name }}</span>
            <span class="ctrl-key">{{ action.keyLabel }}</span>
          </div>
        </div>
      </div>

      <button v-if="selectedMode === 'classic' || selectedMode === 'routine' || selectedMode === 'multiplayer'" class="start-btn" @click="startGame">
        <span class="btn-text">开始游戏</span>
        <span class="btn-arrow">→</span>
      </button>

      <div class="best-score" v-if="bestScore > 0">
        🏆 最高分: {{ bestScore }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Difficulty } from '@/types/game'
import { ACTION_DEFS } from '@/game/actions'
import { getRoutineList } from '@/game/routines'
import { useStorage } from '@/composables/useStorage'
import { useRouter } from 'vue-router'

const router = useRouter()
const selectedDifficulty = ref<Difficulty>('normal')
const selectedMode = ref<string>('classic')
const selectedRoutine = ref<string>('xiaoma-guohe')
const playerCount = ref(2)
const { getBestScore } = useStorage()
const bestScore = ref(0)
const routineList = getRoutineList()

const difficulties = [
  { value: 'easy' as Difficulty, name: '简单', icon: '🌟', desc: '宽松时限', color: '#4CAF50' },
  { value: 'normal' as Difficulty, name: '普通', icon: '⭐', desc: '标准挑战', color: '#FF6B35' },
  { value: 'hard' as Difficulty, name: '困难', icon: '🔥', desc: '极限操作', color: '#F44336' },
]

const actionList = [
  { ...ACTION_DEFS.step, keyLabel: '↓', color: ACTION_DEFS.step.color },
  { ...ACTION_DEFS.hook, keyLabel: '↑', color: ACTION_DEFS.hook.color },
  { ...ACTION_DEFS.flick, keyLabel: '→', color: ACTION_DEFS.flick.color },
  { ...ACTION_DEFS.wrap, keyLabel: '←', color: ACTION_DEFS.wrap.color },
  { ...ACTION_DEFS.jump, keyLabel: '空格', color: ACTION_DEFS.jump.color },
]

function goMode(mode: string) {
  selectedMode.value = mode
  if (mode === 'tutorial') {
    router.push({ name: 'tutorial' })
  } else if (mode === 'editor') {
    router.push({ name: 'editor' })
  } else if (mode === 'competition') {
    router.push({ name: 'competition' })
  }
}

function startGame() {
  const mode = selectedMode.value
  const query: Record<string, string> = {
    difficulty: selectedDifficulty.value,
    mode,
  }
  if (mode === 'routine') {
    query.routine = selectedRoutine.value
  } else if (mode === 'multiplayer') {
    query.players = String(playerCount.value)
  }
  router.push({ name: 'game', query })
}

onMounted(() => {
  bestScore.value = getBestScore(selectedDifficulty.value)
})

watch(selectedDifficulty, (val) => {
  bestScore.value = getBestScore(val)
})
</script>

<style scoped>
.start-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #87CEEB 0%, #B8E4F9 40%, #FFF8E7 70%, #C8E6C9 100%);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.start-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cloud {
  position: absolute;
  background: white;
  border-radius: 50%;
  opacity: 0.6;
}

.cloud-1 {
  width: 120px; height: 50px; top: 10%; left: 10%;
  animation: cloud-float 20s ease-in-out infinite;
}

.cloud-2 {
  width: 80px; height: 35px; top: 20%; right: 15%;
  animation: cloud-float 25s ease-in-out infinite reverse;
}

.cloud-3 {
  width: 100px; height: 40px; top: 5%; left: 50%;
  animation: cloud-float 22s ease-in-out infinite 5s;
}

@keyframes cloud-float {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(40px); }
}

.start-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 640px;
  width: 100%;
}

.title-section {
  text-align: center;
}

.game-title {
  font-size: 72px;
  font-weight: 900;
  margin: 0;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.title-char {
  display: inline-block;
  color: #FF6B35;
  text-shadow:
    3px 3px 0 #E65100,
    6px 6px 0 rgba(0,0,0,0.1);
  animation: title-bounce 1.5s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.15s);
}

@keyframes title-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.game-subtitle {
  font-size: 18px;
  color: #558B2F;
  margin: 8px 0 0;
  font-weight: 600;
  letter-spacing: 4px;
}

.rubber-band-anim {
  margin-top: 12px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.band-line {
  width: 200px;
  height: 4px;
  background: linear-gradient(90deg, #FF69B4, #FF1493, #FF69B4);
  border-radius: 2px;
  animation: band-wobble 1s ease-in-out infinite;
  box-shadow: 0 0 12px rgba(255,105,180,0.5);
}

@keyframes band-wobble {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  25% { transform: scaleY(1.5) scaleX(0.98); }
  75% { transform: scaleY(0.7) scaleX(1.02); }
}

.section-label {
  font-size: 14px;
  font-weight: 700;
  color: #558B2F;
  margin: 0 0 10px;
  text-align: center;
  letter-spacing: 2px;
}

.mode-section {
  width: 100%;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  border: 2px solid rgba(255,255,255,0.6);
  border-radius: 16px;
  background: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
}

.mode-card:hover {
  background: rgba(255,255,255,0.95);
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
}

.mode-icon {
  font-size: 28px;
}

.mode-name {
  font-size: 14px;
  font-weight: 800;
  color: #333;
}

.mode-desc {
  font-size: 11px;
  color: #888;
}

.difficulty-section {
  width: 100%;
}

.difficulty-options {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.diff-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 20px;
  border: 3px solid transparent;
  border-radius: 16px;
  background: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  max-width: 150px;
  backdrop-filter: blur(4px);
}

.diff-btn:hover {
  background: rgba(255,255,255,0.9);
  transform: translateY(-2px);
}

.diff-btn.selected {
  border-color: var(--diff-color);
  background: rgba(255,255,255,0.95);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1), 0 0 0 4px rgba(255,107,53,0.15);
  transform: scale(1.05);
}

.diff-icon { font-size: 24px; }
.diff-name { font-size: 15px; font-weight: 800; color: #333; }
.diff-desc { font-size: 11px; color: #888; }

.routine-section {
  width: 100%;
}

.routine-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.routine-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 8px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: rgba(255,255,255,0.6);
  cursor: pointer;
  transition: all 0.3s ease;
}

.routine-card:hover {
  background: rgba(255,255,255,0.85);
}

.routine-card.selected {
  border-color: #FF69B4;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 2px 12px rgba(255,105,180,0.3);
}

.routine-name {
  font-size: 13px;
  font-weight: 800;
  color: #333;
}

.routine-origin {
  font-size: 10px;
  color: #888;
}

.routine-height {
  font-size: 10px;
  color: #FF69B4;
  font-weight: 600;
}

.multiplayer-section {
  width: 100%;
}

.player-options {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.player-btn {
  padding: 10px 28px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: rgba(255,255,255,0.7);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #333;
}

.player-btn:hover {
  background: rgba(255,255,255,0.9);
}

.player-btn.selected {
  border-color: #FF6B35;
  background: rgba(255,255,255,0.95);
  box-shadow: 0 2px 12px rgba(255,107,53,0.3);
}

.controls-section {
  width: 100%;
}

.controls-grid {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.control-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.6);
  border: 2px solid var(--card-color);
  min-width: 70px;
}

.ctrl-icon { font-size: 22px; }
.ctrl-name { font-size: 13px; font-weight: 700; color: var(--card-color); }
.ctrl-key {
  font-size: 10px;
  color: #666;
  background: rgba(0,0,0,0.08);
  padding: 1px 6px;
  border-radius: 4px;
}

.start-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 48px;
  border: none;
  border-radius: 50px;
  background: linear-gradient(135deg, #FF6B35, #E65100);
  color: white;
  font-size: 22px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow:
    0 6px 20px rgba(255,107,53,0.4),
    inset 0 1px 0 rgba(255,255,255,0.3);
  letter-spacing: 2px;
}

.start-btn:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 10px 30px rgba(255,107,53,0.5),
    inset 0 1px 0 rgba(255,255,255,0.3);
}

.start-btn:active {
  transform: translateY(0) scale(0.98);
}

.btn-arrow {
  font-size: 24px;
  transition: transform 0.3s ease;
}

.start-btn:hover .btn-arrow {
  transform: translateX(4px);
}

.best-score {
  font-size: 14px;
  color: #558B2F;
  font-weight: 600;
}
</style>
