<template>
  <div class="game-view">
    <HUD
      :level="gameState.currentLevel"
      :height-label="currentLevelLabel"
      :score="gameState.score"
      :combo="gameState.combo"
      :lives="gameState.lives"
      :max-lives="gameState.maxLives"
    />

    <div v-if="gameMode === 'multiplayer'" class="multiplayer-bar">
      <div
        v-for="p in players"
        :key="p.id"
        class="mp-player"
        :class="{ active: p.isActive }"
        :style="{ '--player-color': p.color }"
      >
        <span class="mp-name">{{ p.name }}</span>
        <span class="mp-score">{{ p.score }}</span>
      </div>
    </div>

    <div v-if="gameMode === 'routine'" class="routine-bar">
      <span class="routine-badge">📜 {{ routineName }}</span>
    </div>

    <div class="canvas-wrapper">
      <canvas ref="canvasRef" class="game-canvas" />
    </div>

    <ActionHint
      :actions="actionSequence"
      :current-index="gameState.actionIndex"
      :timer-ratio="actionTimerRatio"
    />

    <VirtualControls
      @action="onTouchAction"
    />

    <Transition name="overlay">
      <div v-if="showLevelComplete" class="overlay">
        <div class="overlay-card level-card">
          <div class="overlay-icon">🎉</div>
          <h2 class="overlay-title">关卡 {{ gameState.currentLevel }} 通过!</h2>
          <p class="overlay-subtitle">{{ currentLevelLabel }} · 过级成功</p>
          <div class="level-stats">
            <div class="stat-item perfect">
              <span class="stat-val">{{ levelResult?.perfectCount ?? 0 }}</span>
              <span class="stat-label">完美</span>
            </div>
            <div class="stat-item good">
              <span class="stat-val">{{ levelResult?.goodCount ?? 0 }}</span>
              <span class="stat-label">不错</span>
            </div>
            <div class="stat-item miss">
              <span class="stat-val">{{ levelResult?.missCount ?? 0 }}</span>
              <span class="stat-label">失误</span>
            </div>
            <div class="stat-item combo">
              <span class="stat-val">{{ levelResult?.maxCombo ?? 0 }}</span>
              <span class="stat-label">连击</span>
            </div>
          </div>
          <div class="level-score">
            得分: <strong>{{ gameState.score }}</strong>
          </div>
          <button class="overlay-btn next-btn" @click="goNextLevel">
            下一关 →
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="overlay">
      <div v-if="showGameOver" class="overlay">
        <div class="overlay-card gameover-card">
          <div class="overlay-icon">{{ gameResult?.victory ? '🏆' : '😢' }}</div>
          <h2 class="overlay-title">{{ gameResult?.victory ? '通关成功!' : '挑战失败' }}</h2>
          <p class="overlay-subtitle">
            {{ gameResult?.victory ? '你太厉害了!' : '再接再厉!' }}
          </p>
          <div class="level-stats">
            <div class="stat-item">
              <span class="stat-val">{{ gameResult?.totalScore ?? 0 }}</span>
              <span class="stat-label">总分</span>
            </div>
            <div class="stat-item">
              <span class="stat-val">{{ gameResult?.levelsCompleted ?? 0 }}</span>
              <span class="stat-label">过级</span>
            </div>
            <div class="stat-item">
              <span class="stat-val">{{ gameResult?.totalPerfect ?? 0 }}</span>
              <span class="stat-label">完美</span>
            </div>
            <div class="stat-item">
              <span class="stat-val">{{ gameResult?.bestCombo ?? 0 }}</span>
              <span class="stat-label">连击</span>
            </div>
          </div>
          <div class="gameover-buttons">
            <button class="overlay-btn retry-btn" @click="retryGame">
              重新挑战
            </button>
            <button class="overlay-btn home-btn" @click="goHome">
              返回首页
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="overlay">
      <div v-if="showPlayerSwitch" class="overlay">
        <div class="overlay-card switch-card">
          <div class="overlay-icon">🔄</div>
          <h2 class="overlay-title">轮到 {{ currentPlayerName }}</h2>
          <button class="overlay-btn next-btn" @click="continueAfterSwitch">
            准备好了!
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import type { Difficulty, ActionType, GameState, LevelResult, GameResult, GameMode, PlayerInfo } from '@/types/game'
import { GameEngine } from '@/game/engine'
import { getLevelConfig } from '@/game/levels'
import { ACTION_DEFS } from '@/game/actions'
import { getRoutineById } from '@/game/routines'
import { useStorage } from '@/composables/useStorage'
import { useRoute, useRouter } from 'vue-router'
import HUD from '@/components/HUD.vue'
import ActionHint from '@/components/ActionHint.vue'
import VirtualControls from '@/components/VirtualControls.vue'

const route = useRoute()
const router = useRouter()
const { saveHighScore } = useStorage()

const currentDifficulty = computed<Difficulty>(() => {
  const d = route.query.difficulty as string
  if (d === 'easy' || d === 'normal' || d === 'hard') return d
  return 'normal'
})

const gameMode = computed<GameMode>(() => {
  const m = route.query.mode as string
  if (['classic', 'routine', 'custom', 'multiplayer', 'tutorial', 'competition'].includes(m)) return m as GameMode
  return 'classic'
})

const routineName = computed(() => {
  const id = route.query.routine as string
  if (!id) return ''
  return getRoutineById(id)?.name ?? ''
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let engine: GameEngine | null = null

const gameState = reactive<GameState>({
  phase: 'ready',
  currentLevel: 1,
  score: 0,
  lives: 5,
  maxLives: 5,
  combo: 0,
  maxCombo: 0,
  actionIndex: 0,
  perfectCount: 0,
  goodCount: 0,
  missCount: 0,
  difficulty: currentDifficulty.value,
  lastActionTime: 0,
  actionTimer: 0,
  gameMode: gameMode.value,
  currentPlayerIndex: 0,
  rhythmGrade: 'miss',
  bandElasticity: 0.15,
  bandRecoilForce: 0,
})

const actionSequence = ref<ActionType[]>([])
const actionTimerRatio = ref(1)
const levelResult = ref<LevelResult | null>(null)
const gameResult = ref<GameResult | null>(null)
const showLevelComplete = ref(false)
const showGameOver = ref(false)
const showPlayerSwitch = ref(false)
const players = ref<PlayerInfo[]>([])
const currentPlayerName = ref('')

const currentLevelLabel = computed(() => {
  const config = getLevelConfig(gameState.currentLevel, currentDifficulty.value)
  return config.heightLabel
})

onMounted(() => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  canvas.width = 960
  canvas.height = 540

  const mode = gameMode.value
  const eng = new GameEngine(canvas, currentDifficulty.value, mode)

  if (mode === 'routine') {
    const routineId = route.query.routine as string
    if (routineId) {
      eng.loadRoutine(routineId)
    }
  } else if (mode === 'multiplayer') {
    const playerCount = parseInt(route.query.players as string) || 2
    eng.setupMultiplayer(playerCount)
  }

  eng.onStateChange = (state: GameState) => {
    Object.assign(gameState, state)
    actionSequence.value = eng.getActionSequence()
    actionTimerRatio.value = eng.getActionTimerRatio()
  }

  eng.onLevelComplete = (result: LevelResult) => {
    levelResult.value = result
    showLevelComplete.value = true
  }

  eng.onGameOver = (result: GameResult) => {
    gameResult.value = result
    showGameOver.value = true
    saveHighScore({
      difficulty: currentDifficulty.value,
      score: result.totalScore,
      level: result.levelsCompleted,
      date: new Date().toISOString(),
    })
  }

  eng.onPlayerSwitch = (player: PlayerInfo) => {
    currentPlayerName.value = player.name
    showPlayerSwitch.value = true
  }

  engine = eng
  eng.start()
})

onUnmounted(() => {
  engine?.destroy()
  engine = null
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e: KeyboardEvent) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
    e.preventDefault()
  }
  const key = e.key === ' ' ? 'Space' : e.key
  engine?.handleKeyDown(key)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

function onTouchAction(type: ActionType) {
  const key = ACTION_DEFS[type].key
  engine?.handleKeyDown(key)
}

function goNextLevel() {
  showLevelComplete.value = false
  levelResult.value = null
  engine?.nextLevel()
}

function retryGame() {
  showGameOver.value = false
  gameResult.value = null
  router.replace({ name: 'game', query: route.query })
}

function goHome() {
  showGameOver.value = false
  router.push({ name: 'start' })
}

function continueAfterSwitch() {
  showPlayerSwitch.value = false
  if (engine) {
    engine.resume()
  }
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #1a237e 0%, #283593 50%, #0d47a1 100%);
  padding: 12px;
  gap: 10px;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 960px;
}

.game-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.multiplayer-bar {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 8px 16px;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.mp-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 16px;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.mp-player.active {
  border-color: var(--player-color, #FF6B35);
  background: rgba(255,255,255,0.1);
  box-shadow: 0 0 12px var(--player-color, #FF6B35);
}

.mp-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--player-color, #fff);
}

.mp-score {
  font-size: 18px;
  font-weight: 800;
  color: #FFD700;
}

.routine-bar {
  padding: 6px 20px;
  background: rgba(255,105,180,0.2);
  border: 1px solid rgba(255,105,180,0.4);
  border-radius: 20px;
  backdrop-filter: blur(8px);
}

.routine-badge {
  font-size: 14px;
  font-weight: 700;
  color: #FF69B4;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
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
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
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
  margin: 0 0 4px;
}

.overlay-subtitle {
  font-size: 14px;
  color: #888;
  margin: 0 0 20px;
}

.level-stats {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-val {
  font-size: 24px;
  font-weight: 800;
  color: #333;
}

.stat-label {
  font-size: 11px;
  color: #999;
}

.stat-item.perfect .stat-val { color: #FFD700; }
.stat-item.good .stat-val { color: #4CAF50; }
.stat-item.miss .stat-val { color: #F44336; }
.stat-item.combo .stat-val { color: #FF6B35; }

.level-score {
  font-size: 16px;
  color: #555;
  margin-bottom: 20px;
}

.level-score strong {
  color: #FF6B35;
  font-size: 22px;
}

.gameover-buttons {
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
  letter-spacing: 1px;
}

.next-btn {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  box-shadow: 0 4px 12px rgba(76,175,80,0.4);
}

.next-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(76,175,80,0.5);
}

.retry-btn {
  background: linear-gradient(135deg, #FF6B35, #E65100);
  color: white;
  box-shadow: 0 4px 12px rgba(255,107,53,0.4);
}

.retry-btn:hover {
  transform: translateY(-2px);
}

.home-btn {
  background: rgba(0,0,0,0.08);
  color: #555;
}

.home-btn:hover {
  background: rgba(0,0,0,0.12);
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
