<template>
  <div class="tutorial-view">
    <div class="tutorial-header">
      <button class="back-btn" @click="goHome">← 返回</button>
      <h1 class="page-title">分步教学</h1>
      <div class="progress-section">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: overallProgress * 100 + '%' }"></div>
        </div>
        <span class="progress-text">{{ Math.round(overallProgress * 100) }}%</span>
      </div>
    </div>

    <div v-if="!tutorialComplete" class="step-card">
      <div class="step-icon">{{ currentStepDef?.icon }}</div>
      <h2 class="step-name">{{ currentStep?.instruction }}</h2>
      <p class="step-guide">{{ currentStepDef?.name }} - 按键: {{ currentStepDef?.key }}</p>
      <p class="step-hint">{{ currentStep?.hint }}</p>
      <div class="practice-info">
        <span class="practice-count">{{ currentStep?.completed ?? 0 }}/{{ currentStep?.practiceRounds ?? 0 }}</span>
        <div class="step-progress-bar-bg">
          <div class="step-progress-bar-fill" :style="{ width: stepProgress * 100 + '%' }"></div>
        </div>
      </div>
    </div>

    <div class="canvas-wrapper">
      <canvas ref="canvasRef" class="game-canvas" />
    </div>

    <div v-if="!tutorialComplete" class="step-nav">
      <button class="nav-btn prev-btn" :disabled="currentStepIndex === 0" @click="prevStep">上一步</button>
      <button class="nav-btn next-btn" :disabled="currentStepIndex >= totalSteps - 1" @click="nextStep">下一步</button>
    </div>

    <Transition name="overlay">
      <div v-if="tutorialComplete" class="overlay">
        <div class="overlay-card">
          <div class="overlay-icon">🎓</div>
          <h2 class="overlay-title">教学完成!</h2>
          <p class="overlay-subtitle">你已经掌握了所有基本动作</p>
          <div class="overlay-buttons">
            <button class="overlay-btn start-btn" @click="goGame">开始游戏</button>
            <button class="overlay-btn home-btn" @click="goHome">返回首页</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GameState, LevelResult, GameResult, TutorialStep } from '@/types/game'
import { GameEngine } from '@/game/engine'
import { ACTION_DEFS } from '@/game/actions'
import { useRouter } from 'vue-router'

const router = useRouter()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let engine: GameEngine | null = null

const currentStepIndex = ref(0)
const totalSteps = ref(5)
const overallProgress = ref(0)
const stepProgress = ref(0)
const tutorialComplete = ref(false)

const currentStep = computed(() => engine?.tutorialEngine?.getCurrentStep() ?? null)
const currentStepDef = computed(() => {
  const action = currentStep.value?.action
  return action ? ACTION_DEFS[action] : null
})

onMounted(() => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  canvas.width = 960
  canvas.height = 540

  const eng = new GameEngine(canvas, 'easy', 'tutorial')

  eng.onStateChange = () => {
    refreshProgress()
  }

  eng.onTutorialStepComplete = (step: TutorialStep) => {
    currentStepIndex.value = eng.tutorialEngine?.config.currentStepIndex ?? currentStepIndex.value
    refreshProgress()
  }

  eng.onGameOver = (result: GameResult) => {
    if (eng.tutorialEngine?.isTutorialComplete()) {
      tutorialComplete.value = true
    }
    refreshProgress()
  }

  engine = eng
  eng.start()
  refreshProgress()

  window.addEventListener('keydown', onKeyDown)
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

function refreshProgress() {
  const te = engine?.tutorialEngine
  if (!te) return
  overallProgress.value = te.getOverallProgress()
  stepProgress.value = te.getStepProgress()
  currentStepIndex.value = te.config.currentStepIndex
  totalSteps.value = te.config.steps.length
  tutorialComplete.value = te.isTutorialComplete()
}

function prevStep() {
  const te = engine?.tutorialEngine
  if (!te || currentStepIndex.value <= 0) return
  te.config.currentStepIndex = currentStepIndex.value - 1
  te.currentAction = te.config.steps[te.config.currentStepIndex].action
  te.practiceCount = 0
  te.showHint = true
  engine?.reset()
  engine?.start('tutorial')
  refreshProgress()
}

function nextStep() {
  const te = engine?.tutorialEngine
  if (!te || currentStepIndex.value >= totalSteps.value - 1) return
  te.advanceStep()
  currentStepIndex.value = te.config.currentStepIndex
  engine?.reset()
  engine?.start('tutorial')
  refreshProgress()
}

function goGame() {
  router.push({ name: 'game', query: { difficulty: 'easy' } })
}

function goHome() {
  router.push({ name: 'start' })
}
</script>

<style scoped>
.tutorial-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #1a237e 0%, #283593 50%, #0d47a1 100%);
  padding: 12px;
  gap: 10px;
  overflow: hidden;
}

.tutorial-header {
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
  flex-shrink: 0;
}

.progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-bg {
  flex: 1;
  height: 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 5px;
  transition: width 0.4s ease;
}

.progress-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  min-width: 36px;
  text-align: right;
}

.step-card {
  width: 100%;
  max-width: 960px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.step-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.step-name {
  font-size: 20px;
  font-weight: 800;
  color: white;
  margin: 0;
}

.step-guide {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 2px 0 0;
}

.step-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 4px 0 0;
}

.practice-info {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 100px;
}

.practice-count {
  font-size: 16px;
  font-weight: 700;
  color: #FFD700;
}

.step-progress-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.step-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FF6B35);
  border-radius: 3px;
  transition: width 0.4s ease;
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

.step-nav {
  width: 100%;
  max-width: 960px;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
}

.nav-btn {
  padding: 10px 32px;
  border: none;
  border-radius: 50px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.prev-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.prev-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.25);
}

.next-btn {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.next-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(76, 175, 80, 0.5);
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
  margin: 0 0 4px;
}

.overlay-subtitle {
  font-size: 14px;
  color: #888;
  margin: 0 0 20px;
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

.start-btn {
  background: linear-gradient(135deg, #FF6B35, #E65100);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(255, 107, 53, 0.5);
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
