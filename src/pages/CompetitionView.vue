<template>
  <div class="competition-view">
    <div class="comp-header">
      <button class="back-btn" @click="goHome">← 返回</button>
      <h1 class="page-title">在线比赛</h1>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'leaderboard'" class="tab-content">
      <div class="leaderboard-list">
        <div
          v-for="entry in leaderboard"
          :key="entry.rank"
          class="lb-row"
          :class="{ 'is-player': entry.isPlayer }"
        >
          <span class="lb-rank">{{ entry.rank }}</span>
          <span class="lb-name">{{ entry.name }}</span>
          <span class="lb-score">{{ entry.score.toLocaleString() }}</span>
          <span class="lb-level">Lv.{{ entry.level }}</span>
          <span class="lb-combo">x{{ entry.combo }}</span>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'challenge'" class="tab-content">
      <div v-if="!challengeActive" class="challenge-intro">
        <div class="challenge-icon">⚔️</div>
        <h2 class="challenge-title">挑战赛</h2>
        <p class="challenge-desc">在60秒内获取最高分！挑战你的极限！</p>
        <button class="challenge-start-btn" @click="startChallenge">开始挑战</button>
      </div>

      <div v-if="challengeActive" class="challenge-area">
        <div class="challenge-hud">
          <div class="hud-item">
            <span class="hud-label">剩余时间</span>
            <span class="hud-value" :class="{ 'time-warning': challengeTimeLeft <= 10 }">{{ challengeTimeLeft }}s</span>
          </div>
          <div class="hud-item">
            <span class="hud-label">当前得分</span>
            <span class="hud-value score-value">{{ challengeScore }}</span>
          </div>
        </div>
        <div class="canvas-wrapper">
          <canvas ref="canvasRef" class="game-canvas" />
        </div>
      </div>

      <Transition name="overlay">
        <div v-if="showChallengeResult" class="overlay">
          <div class="overlay-card">
            <div class="overlay-icon">🏅</div>
            <h2 class="overlay-title">挑战结束!</h2>
            <div class="result-stats">
              <div class="stat-item">
                <span class="stat-val">{{ challengeScore }}</span>
                <span class="stat-label">总得分</span>
              </div>
              <div class="stat-item">
                <span class="stat-val">{{ challengeLevel }}</span>
                <span class="stat-label">关卡</span>
              </div>
            </div>
            <div class="overlay-buttons">
              <button class="overlay-btn retry-btn" @click="restartChallenge">再来一次</button>
              <button class="overlay-btn home-btn" @click="closeChallengeResult">返回</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="activeTab === 'records'" class="tab-content">
      <div v-if="records.length === 0" class="empty-records">
        <span class="empty-icon">📋</span>
        <p class="empty-text">暂无比赛记录</p>
      </div>
      <div v-else class="records-list">
        <div v-for="(rec, idx) in records" :key="idx" class="record-row">
          <span class="rec-date">{{ rec.date }}</span>
          <span class="rec-score">{{ rec.score.toLocaleString() }}分</span>
          <span class="rec-level">Lv.{{ rec.level }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ActionType, CompetitionEntry, GameState, LevelResult, GameResult } from '@/types/game'
import { GameEngine } from '@/game/engine'
import { ACTION_DEFS } from '@/game/actions'
import { useRouter } from 'vue-router'

const router = useRouter()

const RECORDS_KEY = 'competition-records'

interface CompetitionRecord {
  date: string
  score: number
  level: number
}

const tabs = [
  { key: 'leaderboard', label: '排行榜' },
  { key: 'challenge', label: '挑战赛' },
  { key: 'records', label: '我的记录' },
]

const activeTab = ref('leaderboard')

const leaderboard = ref<CompetitionEntry[]>([
  { rank: 1, name: '跳皮筋大师', score: 12000, level: 8, combo: 25, date: '2024-01-15', isPlayer: false },
  { rank: 2, name: '皮筋女王', score: 10500, level: 8, combo: 22, date: '2024-01-14', isPlayer: false },
  { rank: 3, name: '花式高手', score: 9200, level: 7, combo: 20, date: '2024-01-13', isPlayer: false },
  { rank: 4, name: '灵活小鹿', score: 8100, level: 7, combo: 18, date: '2024-01-12', isPlayer: false },
  { rank: 5, name: '我', score: 7500, level: 6, combo: 16, date: '2024-01-11', isPlayer: true },
  { rank: 6, name: '跳跃达人', score: 6800, level: 6, combo: 14, date: '2024-01-10', isPlayer: false },
  { rank: 7, name: '皮筋新手', score: 5200, level: 5, combo: 11, date: '2024-01-09', isPlayer: false },
  { rank: 8, name: '开心果', score: 3900, level: 4, combo: 9, date: '2024-01-08', isPlayer: false },
  { rank: 9, name: '小跳蛙', score: 2600, level: 3, combo: 6, date: '2024-01-07', isPlayer: false },
  { rank: 10, name: '初学者', score: 1200, level: 2, combo: 3, date: '2024-01-06', isPlayer: false },
])

const challengeActive = ref(false)
const challengeScore = ref(0)
const challengeTimeLeft = ref(60)
const challengeLevel = ref(1)
const showChallengeResult = ref(false)

const canvasRef = ref<HTMLCanvasElement | null>(null)
let engine: GameEngine | null = null
let challengeTimer: ReturnType<typeof setInterval> | null = null

const records = ref<CompetitionRecord[]>([])

function loadRecords() {
  try {
    const data = localStorage.getItem(RECORDS_KEY)
    records.value = data ? JSON.parse(data) : []
  } catch {
    records.value = []
  }
}

function saveRecord(score: number, level: number) {
  const rec: CompetitionRecord = {
    date: new Date().toLocaleDateString('zh-CN'),
    score,
    level,
  }
  records.value.unshift(rec)
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records.value))
}

onMounted(() => {
  loadRecords()
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  engine?.destroy()
  engine = null
  if (challengeTimer) {
    clearInterval(challengeTimer)
    challengeTimer = null
  }
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e: KeyboardEvent) {
  if (!challengeActive.value) return
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
    e.preventDefault()
  }
  const key = e.key === ' ' ? 'Space' : e.key
  engine?.handleKeyDown(key)
}

function startChallenge() {
  challengeActive.value = true
  challengeScore.value = 0
  challengeTimeLeft.value = 60
  challengeLevel.value = 1
  showChallengeResult.value = false

  if (!canvasRef.value) return
  const canvas = canvasRef.value
  canvas.width = 960
  canvas.height = 540

  const eng = new GameEngine(canvas, 'normal', 'competition')

  eng.onStateChange = (state: GameState) => {
    challengeScore.value = state.score
    challengeLevel.value = state.currentLevel
  }

  eng.onLevelComplete = (result: LevelResult) => {
    setTimeout(() => {
      eng.nextLevel()
    }, 500)
  }

  eng.onGameOver = (result: GameResult) => {
    endChallenge(result.totalScore, result.levelsCompleted)
  }

  engine = eng
  eng.start()

  challengeTimer = setInterval(() => {
    challengeTimeLeft.value--
    if (challengeTimeLeft.value <= 0) {
      endChallenge(challengeScore.value, challengeLevel.value)
    }
  }, 1000)
}

function endChallenge(score: number, level: number) {
  challengeActive.value = false
  showChallengeResult.value = true

  if (challengeTimer) {
    clearInterval(challengeTimer)
    challengeTimer = null
  }

  engine?.destroy()
  engine = null

  saveRecord(score, level)
}

function restartChallenge() {
  showChallengeResult.value = false
  startChallenge()
}

function closeChallengeResult() {
  showChallengeResult.value = false
}

function goHome() {
  router.push({ name: 'start' })
}
</script>

<style scoped>
.competition-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #1a237e 0%, #283593 50%, #0d47a1 100%);
  padding: 12px;
  gap: 10px;
  overflow: hidden;
}

.comp-header {
  width: 100%;
  max-width: 960px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.back-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: white;
  margin: 0;
}

.tabs {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 4px;
  width: 100%;
  max-width: 960px;
}

.tab-btn {
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.tab-content {
  width: 100%;
  max-width: 960px;
  flex: 1;
  overflow-y: auto;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.2s;
}

.lb-row.is-player {
  background: rgba(255, 107, 53, 0.2);
  border-color: rgba(255, 107, 53, 0.4);
}

.lb-rank {
  font-size: 18px;
  font-weight: 900;
  color: #FFD700;
  min-width: 32px;
  text-align: center;
}

.lb-row.is-player .lb-rank {
  color: #FF6B35;
}

.lb-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.lb-row.is-player .lb-name {
  color: #FF6B35;
}

.lb-score {
  font-size: 16px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  min-width: 80px;
  text-align: right;
}

.lb-level {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  min-width: 40px;
  text-align: center;
}

.lb-combo {
  font-size: 12px;
  color: #4CAF50;
  min-width: 40px;
  text-align: center;
}

.challenge-intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
}

.challenge-icon {
  font-size: 56px;
}

.challenge-title {
  font-size: 28px;
  font-weight: 900;
  color: white;
  margin: 0;
}

.challenge-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.challenge-start-btn {
  margin-top: 12px;
  padding: 14px 48px;
  border: none;
  border-radius: 50px;
  background: linear-gradient(135deg, #FF6B35, #E65100);
  color: white;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
}

.challenge-start-btn:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 24px rgba(255, 107, 53, 0.5);
}

.challenge-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.challenge-hud {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hud-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.hud-value {
  font-size: 24px;
  font-weight: 900;
  color: white;
}

.hud-value.time-warning {
  color: #F44336;
  animation: pulse 0.5s ease-in-out infinite;
}

.hud-value.score-value {
  color: #FFD700;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.canvas-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 960px;
}

.game-canvas {
  display: block;
  max-width: 100%;
  max-height: 420px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.empty-records {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.record-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.rec-date {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  min-width: 100px;
}

.rec-score {
  flex: 1;
  font-size: 16px;
  font-weight: 800;
  color: #FFD700;
}

.rec-level {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.overlay-card {
  background: linear-gradient(145deg, #fff 0%, #f5f5f5 100%);
  border-radius: 24px;
  padding: 36px 44px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 420px;
  width: 90%;
}

.overlay-icon {
  font-size: 56px;
  margin-bottom: 8px;
}

.overlay-title {
  font-size: 28px;
  font-weight: 900;
  color: #333;
  margin: 0 0 16px;
}

.result-stats {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-val {
  font-size: 28px;
  font-weight: 900;
  color: #FF6B35;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.overlay-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.overlay-btn {
  padding: 12px 28px;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn {
  background: linear-gradient(135deg, #FF6B35, #E65100);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}

.retry-btn:hover {
  transform: translateY(-2px);
}

.home-btn {
  background: rgba(0, 0, 0, 0.08);
  color: #555;
}

.home-btn:hover {
  background: rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.overlay-enter-active {
  animation: overlay-in 0.4s ease;
}

.overlay-leave-active {
  animation: overlay-in 0.3s ease reverse;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.overlay-enter-active .overlay-card {
  animation: card-in 0.4s ease;
}

@keyframes card-in {
  from {
    transform: scale(0.8) translateY(20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}
</style>
