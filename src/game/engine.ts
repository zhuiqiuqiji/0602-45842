import type {
  GameState,
  GamePhase,
  Difficulty,
  ActionType,
  CharacterRenderState,
  RubberBandState,
  CloudState,
  Particle,
  ActionFeedback,
  LevelResult,
  GameResult,
  ActionGrade,
} from '@/types/game'
import { getLevelConfig, getTotalLevels } from './levels'
import { ACTION_DEFS, getKeyActionMap } from './actions'
import {
  drawBackground,
  drawRubberBand,
  drawAssistant,
  drawPlayer,
  drawParticles,
  drawActionFeedback,
  drawHeightRuler,
  drawActionPreviewOnCanvas,
} from './sprites'

const CANVAS_W = 960
const CANVAS_H = 540
const GROUND_Y = 440

export class GameEngine {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  state: GameState
  difficulty: Difficulty
  animFrameId: number = 0
  lastTime: number = 0

  player: CharacterRenderState
  leftAssistant: CharacterRenderState
  rightAssistant: CharacterRenderState
  rubberBand: RubberBandState
  clouds: CloudState[]
  particles: Particle[]
  feedbacks: ActionFeedback[]

  currentLevelConfig: ReturnType<typeof getLevelConfig> | null = null
  actionTimer: number = 0
  playerActionDuration: number = 0
  levelResults: LevelResult[] = []

  onStateChange: ((state: GameState) => void) | null = null
  onLevelComplete: ((result: LevelResult) => void) | null = null
  onGameOver: ((result: GameResult) => void) | null = null

  keyActionMap: Record<string, ActionType>

  private touchActionHandler: ((action: ActionType) => void) | null = null

  constructor(canvas: HTMLCanvasElement, difficulty: Difficulty) {
    this.canvas = canvas
    this.canvas.width = CANVAS_W
    this.canvas.height = CANVAS_H
    this.ctx = canvas.getContext('2d')!
    this.difficulty = difficulty
    this.keyActionMap = getKeyActionMap()

    this.state = this.createInitialState(difficulty)
    this.player = this.createPlayer()
    this.leftAssistant = this.createAssistant(170, true)
    this.rightAssistant = this.createAssistant(790, false)
    this.rubberBand = this.createRubberBand()
    this.clouds = this.createClouds()
    this.particles = []
    this.feedbacks = []
  }

  private createInitialState(difficulty: Difficulty): GameState {
    return {
      phase: 'ready',
      currentLevel: 1,
      score: 0,
      lives: difficulty === 'easy' ? 8 : difficulty === 'hard' ? 3 : 5,
      maxLives: difficulty === 'easy' ? 8 : difficulty === 'hard' ? 3 : 5,
      combo: 0,
      maxCombo: 0,
      actionIndex: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
      difficulty,
      lastActionTime: 0,
      actionTimer: 0,
    }
  }

  private createPlayer(): CharacterRenderState {
    return {
      x: CANVAS_W / 2,
      y: GROUND_Y,
      state: 'idle',
      animProgress: 0,
      facingRight: true,
      jumpHeight: 0,
      legAngle: 0,
      armAngle: 0,
    }
  }

  private createAssistant(x: number, facingRight: boolean): CharacterRenderState {
    return {
      x,
      y: GROUND_Y,
      state: 'idle',
      animProgress: 0,
      facingRight,
      jumpHeight: 0,
      legAngle: 0,
      armAngle: 0,
    }
  }

  private createRubberBand(): RubberBandState {
    return {
      leftX: 170,
      rightX: 790,
      y: GROUND_Y - 30,
      targetY: GROUND_Y - 30,
      wobble: 0,
      wobbleSpeed: 0.15,
      wobbleDecay: 0.97,
    }
  }

  private createClouds(): CloudState[] {
    const clouds: CloudState[] = []
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * CANVAS_W,
        y: 30 + Math.random() * 80,
        width: 40 + Math.random() * 60,
        speed: 0.15 + Math.random() * 0.25,
        opacity: 0.4 + Math.random() * 0.4,
      })
    }
    return clouds
  }

  start() {
    this.loadLevel(this.state.currentLevel)
    this.state.phase = 'playing'
    this.state.lastActionTime = performance.now()
    this.state.actionTimer = this.currentLevelConfig!.timePerAction
    this.emitStateChange()
    this.lastTime = performance.now()
    this.gameLoop(this.lastTime)
  }

  pause() {
    if (this.state.phase === 'playing') {
      this.state.phase = 'paused'
      this.emitStateChange()
    }
  }

  resume() {
    if (this.state.phase === 'paused') {
      this.state.phase = 'playing'
      this.state.lastActionTime = performance.now()
      this.emitStateChange()
      this.lastTime = performance.now()
      this.gameLoop(this.lastTime)
    }
  }

  reset() {
    cancelAnimationFrame(this.animFrameId)
    this.state = this.createInitialState(this.difficulty)
    this.player = this.createPlayer()
    this.rubberBand = this.createRubberBand()
    this.particles = []
    this.feedbacks = []
    this.levelResults = []
    this.currentLevelConfig = null
    this.emitStateChange()
  }

  destroy() {
    cancelAnimationFrame(this.animFrameId)
  }

  handleTouchAction(action: ActionType) {
    if (this.touchActionHandler) {
      this.touchActionHandler(action)
    }
  }

  handleKeyDown(key: string) {
    if (this.state.phase !== 'playing') return
    const action = this.keyActionMap[key]
    if (action) {
      this.processAction(action)
    }
  }

  private loadLevel(level: number) {
    const config = getLevelConfig(level, this.difficulty)
    this.currentLevelConfig = config
    this.state.actionIndex = 0
    this.state.actionTimer = config.timePerAction
    this.state.lastActionTime = performance.now()
    this.rubberBand.targetY = config.rubberBandY

    this.leftAssistant.armAngle = config.assistantArmAngle
    this.rightAssistant.armAngle = config.assistantArmAngle

    this.state.perfectCount = 0
    this.state.goodCount = 0
    this.state.missCount = 0
    this.state.combo = 0
  }

  private processAction(action: ActionType) {
    if (!this.currentLevelConfig) return

    const expectedAction = this.currentLevelConfig.actions[this.state.actionIndex]
    if (!expectedAction) return

    if (action === expectedAction) {
      const elapsed = performance.now() - this.state.lastActionTime
      const timeRatio = elapsed / this.currentLevelConfig.timePerAction
      let grade: ActionGrade
      let scoreAdd: number
      let feedbackText: string
      let feedbackColor: string

      if (timeRatio < 0.3) {
        grade = 'perfect'
        scoreAdd = 100
        feedbackText = '完美!'
        feedbackColor = '#FFD700'
        this.state.perfectCount++
        this.spawnPerfectParticles()
      } else if (timeRatio < 0.7) {
        grade = 'good'
        scoreAdd = 60
        feedbackText = '不错!'
        feedbackColor = '#4CAF50'
        this.state.goodCount++
      } else {
        grade = 'good'
        scoreAdd = 30
        feedbackText = '可以!'
        feedbackColor = '#2196F3'
        this.state.goodCount++
      }

      this.state.combo++
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo
      }
      const comboBonus = Math.floor(this.state.combo / 3) * 20
      this.state.score += scoreAdd + comboBonus

      this.playActionAnimation(action)

      this.feedbacks.push({
        grade,
        x: this.player.x,
        y: GROUND_Y - this.player.jumpHeight - 80,
        opacity: 1,
        scale: 1.2,
        text: feedbackText + (comboBonus > 0 ? ` +${comboBonus}` : ''),
        color: feedbackColor,
      })

      this.rubberBand.wobble = 15
      this.state.actionIndex++
      this.state.lastActionTime = performance.now()
      this.state.actionTimer = this.currentLevelConfig.timePerAction

      if (this.state.actionIndex >= this.currentLevelConfig.actions.length) {
        this.completeLevel()
      }
    } else {
      this.handleMiss()
    }

    this.emitStateChange()
  }

  private handleMiss() {
    this.state.missCount++
    this.state.combo = 0
    this.state.lives--

    this.feedbacks.push({
      grade: 'miss',
      x: this.player.x,
      y: GROUND_Y - 80,
      opacity: 1,
      scale: 1,
      text: '失误!',
      color: '#F44336',
    })

    this.spawnMissParticles()

    if (this.state.lives <= 0) {
      this.gameOver(false)
    } else if (this.state.missCount >= (this.currentLevelConfig?.maxMistakes ?? 5)) {
      this.gameOver(false)
    }

    this.state.lastActionTime = performance.now()
    this.state.actionTimer = this.currentLevelConfig!.timePerAction
  }

  private completeLevel() {
    const result: LevelResult = {
      level: this.state.currentLevel,
      perfectCount: this.state.perfectCount,
      goodCount: this.state.goodCount,
      missCount: this.state.missCount,
      maxCombo: this.state.maxCombo,
      score: this.state.score,
      passed: true,
    }
    this.levelResults.push(result)

    this.state.score += 200 * this.state.currentLevel

    this.spawnCelebrationParticles()

    if (this.state.currentLevel >= getTotalLevels()) {
      setTimeout(() => this.gameOver(true), 1500)
    } else {
      this.state.phase = 'levelComplete'
      this.emitStateChange()
      if (this.onLevelComplete) {
        this.onLevelComplete(result)
      }
    }
  }

  nextLevel() {
    this.state.currentLevel++
    this.state.maxCombo = 0
    this.loadLevel(this.state.currentLevel)
    this.state.phase = 'playing'
    this.state.lastActionTime = performance.now()
    this.emitStateChange()
    this.lastTime = performance.now()
    this.gameLoop(this.lastTime)
  }

  private gameOver(victory: boolean) {
    this.state.phase = victory ? 'victory' : 'gameOver'
    cancelAnimationFrame(this.animFrameId)

    const result: GameResult = {
      totalScore: this.state.score,
      levelsCompleted: victory ? this.state.currentLevel : this.state.currentLevel - 1,
      totalPerfect: this.levelResults.reduce((s, r) => s + r.perfectCount, 0),
      totalGood: this.levelResults.reduce((s, r) => s + r.goodCount, 0),
      totalMiss: this.levelResults.reduce((s, r) => s + r.missCount, 0),
      bestCombo: Math.max(...this.levelResults.map(r => r.maxCombo), 0),
      victory,
    }

    this.emitStateChange()
    if (this.onGameOver) {
      this.onGameOver(result)
    }
  }

  private playActionAnimation(action: ActionType) {
    const stateMap: Record<ActionType, CharacterRenderState['state']> = {
      step: 'stepping',
      hook: 'hooking',
      flick: 'flicking',
      wrap: 'wrapping',
      jump: 'jumping',
    }
    this.player.state = stateMap[action]
    this.player.animProgress = 0
    this.playerActionDuration = 400

    if (action === 'jump') {
      this.animateJump()
    }
  }

  private animateJump() {
    const jumpHeight = 100
    const duration = 400
    const startTime = performance.now()
    const startY = this.player.jumpHeight

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      this.player.jumpHeight = startY + jumpHeight * Math.sin(t * Math.PI)
      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        this.player.jumpHeight = 0
      }
    }
    requestAnimationFrame(animate)
  }

  private spawnPerfectParticles() {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 40,
        y: GROUND_Y - 50 - Math.random() * 30,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        life: 1,
        maxLife: 1,
        color: ['#FFD700', '#FF6B35', '#4CAF50', '#FF69B4'][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 4,
      })
    }
  }

  private spawnMissParticles() {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 30,
        y: GROUND_Y - 40,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2,
        life: 1,
        maxLife: 1,
        color: '#F44336',
        size: 2 + Math.random() * 3,
      })
    }
  }

  private spawnCelebrationParticles() {
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: CANVAS_W / 2 + (Math.random() - 0.5) * 300,
        y: CANVAS_H / 2 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 2,
        life: 1.5,
        maxLife: 1.5,
        color: ['#FFD700', '#FF6B35', '#4CAF50', '#FF69B4', '#2196F3', '#9C27B0'][Math.floor(Math.random() * 6)],
        size: 4 + Math.random() * 5,
      })
    }
  }

  private gameLoop = (timestamp: number) => {
    if (this.state.phase !== 'playing') return

    const dt = Math.min(timestamp - this.lastTime, 50)
    this.lastTime = timestamp

    this.update(dt, timestamp)
    this.render(timestamp)

    this.animFrameId = requestAnimationFrame(this.gameLoop)
  }

  private update(dt: number, time: number) {
    this.updateActionTimer(dt)
    this.updatePlayerAnimation(dt)
    this.updateRubberBand(dt)
    this.updateClouds(dt)
    this.updateParticles(dt)
    this.updateFeedbacks(dt)
  }

  private updateActionTimer(dt: number) {
    if (!this.currentLevelConfig) return
    this.state.actionTimer -= dt
    if (this.state.actionTimer <= 0) {
      this.handleMiss()
      this.state.actionTimer = this.currentLevelConfig.timePerAction
      this.state.lastActionTime = performance.now()
    }
  }

  private updatePlayerAnimation(dt: number) {
    if (this.player.state !== 'idle') {
      this.playerActionDuration -= dt
      this.player.animProgress = Math.min(this.player.animProgress + dt * 0.003, 1)
      if (this.playerActionDuration <= 0) {
        this.player.state = 'idle'
        this.player.animProgress = 0
        this.playerActionDuration = 0
      }
    }
  }

  private updateRubberBand(dt: number) {
    const diff = this.rubberBand.targetY - this.rubberBand.y
    this.rubberBand.y += diff * 0.05
    this.rubberBand.wobble *= this.rubberBand.wobbleDecay
  }

  private updateClouds(dt: number) {
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt * 0.05
      if (cloud.x > CANVAS_W + 80) {
        cloud.x = -80
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05
      p.life -= dt * 0.001
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  private updateFeedbacks(dt: number) {
    for (let i = this.feedbacks.length - 1; i >= 0; i--) {
      const fb = this.feedbacks[i]
      fb.y -= 1
      fb.opacity -= dt * 0.002
      fb.scale = Math.max(fb.scale - dt * 0.001, 0.8)
      if (fb.opacity <= 0) {
        this.feedbacks.splice(i, 1)
      }
    }
  }

  private render(time: number) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    drawBackground(ctx, time, this.clouds)

    this.rubberBand.leftX = this.leftAssistant.x + 25
    this.rubberBand.rightX = this.rightAssistant.x - 25

    drawAssistant(ctx, this.leftAssistant, this.currentLevelConfig?.assistantArmAngle ?? -10, this.rubberBand.y)
    drawAssistant(ctx, this.rightAssistant, this.currentLevelConfig?.assistantArmAngle ?? -10, this.rubberBand.y)

    drawRubberBand(ctx, this.rubberBand, time)

    drawPlayer(ctx, this.player, time)
    drawParticles(ctx, this.particles)
    drawActionFeedback(ctx, this.feedbacks)

    if (this.currentLevelConfig) {
      drawHeightRuler(ctx, this.rubberBand.y, this.rubberBand.targetY, this.currentLevelConfig.heightLabel)
    }

    if (this.state.phase === 'playing' && this.currentLevelConfig) {
      const currentAction = this.currentLevelConfig.actions[this.state.actionIndex]
      drawActionPreviewOnCanvas(ctx, currentAction ?? null, time)
    }

    if (this.state.phase === 'playing') {
      this.drawTimerBar(ctx)
    }
  }

  private drawTimerBar(ctx: CanvasRenderingContext2D) {
    if (!this.currentLevelConfig) return
    const barW = 300
    const barH = 8
    const barX = (CANVAS_W - barW) / 2
    const barY = 120
    const ratio = Math.max(this.state.actionTimer / this.currentLevelConfig.timePerAction, 0)

    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.roundRect(barX, barY, barW, barH, 4)
    ctx.fill()

    const color = ratio > 0.5 ? '#4CAF50' : ratio > 0.25 ? '#FF9800' : '#F44336'
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(barX, barY, barW * ratio, barH, 4)
    ctx.fill()
  }

  private emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state })
    }
  }

  getCurrentAction(): ActionType | null {
    if (!this.currentLevelConfig || this.state.phase !== 'playing') return null
    return this.currentLevelConfig.actions[this.state.actionIndex] ?? null
  }

  getActionSequence(): ActionType[] {
    return this.currentLevelConfig?.actions ?? []
  }

  getActionTimerRatio(): number {
    if (!this.currentLevelConfig) return 1
    return Math.max(this.state.actionTimer / this.currentLevelConfig.timePerAction, 0)
  }

  setTouchActionHandler(handler: (action: ActionType) => void) {
    this.touchActionHandler = handler
  }
}
