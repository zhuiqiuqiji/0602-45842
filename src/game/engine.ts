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
  GameMode,
  PlayerInfo,
  RhythmGrade,
  RoutineDef,
  CustomPattern,
  TutorialConfig,
  TutorialStep,
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
import {
  checkFootRubberBandCollision,
  getActionCollisionQuality,
  drawCollisionDebug,
  GROUND_Y as PHYSICS_GROUND_Y,
  CANVAS_W as PHYSICS_CANVAS_W,
  applyElasticCollision,
  updateElasticBand,
  judgeRhythm,
  getBeatPosition,
  getClosestBeatTime,
  DEFAULT_RHYTHM_CONFIG,
  getHeightObstacle,
  checkJumpHeight,
} from './physics'
import { AIAssistant } from './ai'
import { TutorialEngine } from './tutorial'
import { getRoutineById } from './routines'

const CANVAS_W = PHYSICS_CANVAS_W
const CANVAS_H = 540
const GROUND_Y = PHYSICS_GROUND_Y
const SHOW_COLLISION_DEBUG = false

const PLAYER_COLORS = ['#FF6B35', '#4CAF50', '#2196F3', '#9C27B0']
const PLAYER_NAMES = ['玩家1', '玩家2', '玩家3', '玩家4']

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
  private pendingAction: {
    action: ActionType
    startTime: number
    resolved: boolean
    bestDistance: number
    bestCollision: boolean
  } | null = null

  gameMode: GameMode = 'classic'
  players: PlayerInfo[] = []
  currentPlayerIndex: number = 0
  aiAssistant: AIAssistant | null = null
  tutorialEngine: TutorialEngine | null = null
  currentRoutine: RoutineDef | null = null
  customPattern: CustomPattern | null = null
  rhythmConfig = DEFAULT_RHYTHM_CONFIG
  beatTime: number = 0
  actionHistory: ActionType[] = []

  onStateChange: ((state: GameState) => void) | null = null
  onLevelComplete: ((result: LevelResult) => void) | null = null
  onGameOver: ((result: GameResult) => void) | null = null
  onPlayerSwitch: ((player: PlayerInfo) => void) | null = null
  onTutorialStepComplete: ((step: TutorialStep) => void) | null = null

  keyActionMap: Record<string, ActionType>

  private touchActionHandler: ((action: ActionType) => void) | null = null

  constructor(canvas: HTMLCanvasElement, difficulty: Difficulty, mode?: GameMode) {
    this.canvas = canvas
    this.canvas.width = CANVAS_W
    this.canvas.height = CANVAS_H
    this.ctx = canvas.getContext('2d')!
    this.difficulty = difficulty
    this.gameMode = mode ?? 'classic'
    this.keyActionMap = getKeyActionMap()

    this.state = this.createInitialState(difficulty)
    this.player = this.createPlayer()
    this.leftAssistant = this.createAssistant(170, true)
    this.rightAssistant = this.createAssistant(790, false)
    this.rubberBand = this.createRubberBand()
    this.clouds = this.createClouds()
    this.particles = []
    this.feedbacks = []

    this.aiAssistant = new AIAssistant(this.difficulty)

    if (this.gameMode === 'tutorial') {
      this.setupTutorial()
    } else if (this.gameMode === 'competition') {
      this.setupCompetition()
    }
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
      gameMode: this.gameMode,
      currentPlayerIndex: 0,
      rhythmGrade: 'miss',
      bandElasticity: 0.15,
      bandRecoilForce: 0,
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
      isAI: false,
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
      isAI: false,
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
      elasticity: 0.15,
      recoilForce: 0,
      stretchX: 0,
      velocity: 0,
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

  loadRoutine(routineId: string) {
    const routine = getRoutineById(routineId)
    if (!routine) return
    this.currentRoutine = routine
    this.gameMode = 'routine'
    this.state.gameMode = 'routine'
    this.state.actionIndex = 0
    this.state.actionTimer = routine.timePerAction
    this.state.lastActionTime = performance.now()
    this.rubberBand.targetY = routine.rubberBandY
    this.leftAssistant.armAngle = routine.assistantArmAngle
    this.rightAssistant.armAngle = routine.assistantArmAngle
    this.state.perfectCount = 0
    this.state.goodCount = 0
    this.state.missCount = 0
    this.state.combo = 0
    this.pendingAction = null
  }

  loadCustomPattern(pattern: CustomPattern) {
    this.customPattern = pattern
    this.gameMode = 'custom'
    this.state.gameMode = 'custom'
    this.state.actionIndex = 0
    this.state.actionTimer = pattern.timePerAction
    this.state.lastActionTime = performance.now()
    this.state.perfectCount = 0
    this.state.goodCount = 0
    this.state.missCount = 0
    this.state.combo = 0
    this.pendingAction = null
  }

  setupMultiplayer(playerCount: number) {
    const count = Math.max(2, Math.min(4, playerCount))
    this.gameMode = 'multiplayer'
    this.state.gameMode = 'multiplayer'
    this.players = []
    for (let i = 0; i < count; i++) {
      this.players.push({
        id: i,
        name: PLAYER_NAMES[i],
        color: PLAYER_COLORS[i],
        score: 0,
        lives: this.difficulty === 'easy' ? 8 : this.difficulty === 'hard' ? 3 : 5,
        combo: 0,
        maxCombo: 0,
        perfectCount: 0,
        goodCount: 0,
        missCount: 0,
        actionIndex: 0,
        isActive: i === 0,
      })
    }
    this.currentPlayerIndex = 0
    this.state.currentPlayerIndex = 0
  }

  setupTutorial() {
    this.gameMode = 'tutorial'
    this.state.gameMode = 'tutorial'
    this.tutorialEngine = new TutorialEngine()
    if (!this.aiAssistant) {
      this.aiAssistant = new AIAssistant(this.difficulty)
    }
  }

  setupCompetition() {
    this.gameMode = 'competition'
    this.state.gameMode = 'competition'
    if (!this.aiAssistant) {
      this.aiAssistant = new AIAssistant(this.difficulty)
    }
  }

  private getAssistantArmAngle(): number {
    const baseAngle = this.currentLevelConfig?.assistantArmAngle
      ?? this.currentRoutine?.assistantArmAngle
      ?? -10
    if (!this.aiAssistant) return baseAngle
    const aiAngle = -this.aiAssistant.currentArmAngle
    return baseAngle + (aiAngle - baseAngle) * this.aiAssistant.adaptRate
  }

  private getAIBandHeightOffset(): number {
    if (!this.aiAssistant) return 0
    const baseAngle = this.currentLevelConfig?.assistantArmAngle
      ?? this.currentRoutine?.assistantArmAngle
      ?? -10
    const aiOffset = (-this.aiAssistant.currentArmAngle) - baseAngle
    return aiOffset * 3 * this.aiAssistant.adaptRate
  }

  private getEffectiveRubberBand(): RubberBandState {
    const offset = this.getAIBandHeightOffset()
    return {
      ...this.rubberBand,
      y: this.rubberBand.y + offset,
      targetY: this.rubberBand.targetY + offset,
    }
  }

  switchToNextPlayer() {
    if (this.gameMode !== 'multiplayer' || this.players.length === 0) return
    this.players[this.currentPlayerIndex].isActive = false
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length
    this.players[this.currentPlayerIndex].isActive = true
    this.state.currentPlayerIndex = this.currentPlayerIndex

    const player = this.players[this.currentPlayerIndex]
    this.state.score = player.score
    this.state.lives = player.lives
    this.state.combo = player.combo
    this.state.maxCombo = player.maxCombo
    this.state.perfectCount = player.perfectCount
    this.state.goodCount = player.goodCount
    this.state.missCount = player.missCount
    this.state.actionIndex = player.actionIndex

    if (this.onPlayerSwitch) {
      this.onPlayerSwitch(player)
    }
  }

  getAIPrediction(): ActionType | null {
    if (!this.aiAssistant) return null
    return this.aiAssistant.predictNextAction(this.actionHistory)
  }

  start(mode?: GameMode) {
    if (mode) {
      this.gameMode = mode
      this.state.gameMode = mode
    }

    if (this.gameMode === 'routine' && this.currentRoutine) {
      this.loadLevel(this.state.currentLevel)
    } else if (this.gameMode === 'custom' && this.customPattern) {
      this.state.actionIndex = 0
      this.state.actionTimer = this.customPattern.timePerAction
      this.state.lastActionTime = performance.now()
      this.state.perfectCount = 0
      this.state.goodCount = 0
      this.state.missCount = 0
      this.state.combo = 0
      this.pendingAction = null
    } else if (this.gameMode === 'tutorial') {
      this.setupTutorial()
      this.state.actionTimer = 5000
      this.state.actionIndex = 0
    } else {
      this.loadLevel(this.state.currentLevel)
    }

    this.state.phase = 'playing'
    this.state.lastActionTime = performance.now()
    if (this.gameMode !== 'tutorial') {
      this.state.actionTimer = this.currentLevelConfig?.timePerAction ?? 3000
    }
    this.beatTime = performance.now()
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
    this.pendingAction = null
    this.currentRoutine = null
    this.customPattern = null
    this.actionHistory = []
    this.beatTime = 0
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
    this.pendingAction = null
  }

  private processAction(action: ActionType) {
    if (this.gameMode !== 'tutorial'
        && !this.currentLevelConfig
        && !this.currentRoutine
        && !this.customPattern) return
    if (this.pendingAction && !this.pendingAction.resolved) return

    let expectedAction: ActionType | undefined
    if (this.gameMode === 'routine' && this.currentRoutine) {
      expectedAction = this.currentRoutine.actions[this.state.actionIndex]
    } else if (this.gameMode === 'custom' && this.customPattern) {
      expectedAction = this.customPattern.actions[this.state.actionIndex]
    } else if (this.gameMode === 'tutorial' && this.tutorialEngine) {
      const step = this.tutorialEngine.getCurrentStep()
      expectedAction = step?.action
    } else if (this.currentLevelConfig) {
      expectedAction = this.currentLevelConfig.actions[this.state.actionIndex]
    }

    if (!expectedAction) return

    const actionTime = performance.now()
    const closestBeat = getClosestBeatTime(actionTime, this.rhythmConfig.bpm)
    const rhythmGrade = judgeRhythm(actionTime, closestBeat, this.rhythmConfig)
    this.state.rhythmGrade = rhythmGrade

    this.playActionAnimation(action)

    if (action !== expectedAction) {
      this.handleMiss('动作错误')
      return
    }

    this.pendingAction = {
      action,
      startTime: performance.now(),
      resolved: false,
      bestDistance: Infinity,
      bestCollision: false,
    }

    this.actionHistory.push(action)
  }

  private resolvePendingAction() {
    if (!this.pendingAction || this.pendingAction.resolved) return

    this.pendingAction.resolved = true

    const { action, startTime, bestCollision, bestDistance } = this.pendingAction
    this.pendingAction = null

    if (!bestCollision) {
      this.handleMiss('未触碰到皮筋')
      return
    }

    if (bestCollision) {
      const elasticBand = applyElasticCollision(this.rubberBand, this.rubberBand.recoilForce + 1, action)
      this.rubberBand.elasticity = elasticBand.elasticity
      this.rubberBand.recoilForce = elasticBand.recoilForce
      this.rubberBand.stretchX = elasticBand.stretchX
      this.rubberBand.velocity = elasticBand.velocity
      this.rubberBand.wobble = elasticBand.wobble
      this.rubberBand.wobbleSpeed = elasticBand.wobbleSpeed
    }

    const quality = getActionCollisionQuality(bestDistance, action)
    const timePerAction = this.getTimePerAction()
    const elapsed = performance.now() - startTime
    const timeRatio = elapsed / timePerAction

    let grade: ActionGrade
    let scoreAdd: number
    let feedbackText: string
    let feedbackColor: string

    const rhythmMultiplier = this.state.rhythmGrade === 'perfect' ? 1.5
      : this.state.rhythmGrade === 'good' ? 1.2
      : this.state.rhythmGrade === 'early' || this.state.rhythmGrade === 'late' ? 0.8
      : 1.0

    if (quality === 'perfect' && timeRatio < 0.6) {
      grade = 'perfect'
      scoreAdd = 120
      feedbackText = '完美!'
      feedbackColor = '#FFD700'
      this.state.perfectCount++
      this.spawnPerfectParticles()
    } else if (quality === 'perfect' || quality === 'good') {
      grade = 'good'
      scoreAdd = 70
      feedbackText = '不错!'
      feedbackColor = '#4CAF50'
      this.state.goodCount++
    } else {
      this.handleMiss('距离过远')
      return
    }

    this.state.combo++
    if (this.state.combo > this.state.maxCombo) {
      this.state.maxCombo = this.state.combo
    }
    const comboBonus = Math.floor(this.state.combo / 3) * 20
    const finalScore = Math.floor((scoreAdd + comboBonus) * rhythmMultiplier)
    this.state.score += finalScore

    this.feedbacks.push({
      grade,
      x: this.player.x,
      y: GROUND_Y - this.player.jumpHeight - 80,
      opacity: 1,
      scale: 1.2,
      text: feedbackText + ` +${finalScore}`,
      color: feedbackColor,
    })

    this.rubberBand.wobble = 15
    if (this.gameMode === 'tutorial' && this.tutorialEngine) {
      this.tutorialEngine.recordPractice(true)
      if (this.tutorialEngine.isStepComplete()) {
        if (this.onTutorialStepComplete) {
          const step = this.tutorialEngine.getCurrentStep()
          if (step) this.onTutorialStepComplete(step)
        }
        this.tutorialEngine.advanceStep()
        if (this.tutorialEngine.isTutorialComplete()) {
          this.gameOver(true)
        }
      }
      this.state.actionTimer = 5000
      this.state.lastActionTime = performance.now()
    } else {
      this.state.actionIndex++
      this.state.lastActionTime = performance.now()
      this.state.actionTimer = timePerAction
    }

    if (this.gameMode === 'multiplayer') {
      this.syncCurrentPlayerState()
    }

    const totalActions = this.getTotalActions()
    if (totalActions > 0 && this.state.actionIndex >= totalActions) {
      this.completeLevel()
    }

    this.emitStateChange()
  }

  private handleMiss(reason?: string) {
    this.state.missCount++
    this.state.combo = 0
    this.pendingAction = null

    if (this.gameMode !== 'tutorial') {
      this.state.lives--
    }

    this.feedbacks.push({
      grade: 'miss',
      x: this.player.x,
      y: GROUND_Y - 80,
      opacity: 1,
      scale: 1,
      text: reason ? `失误:${reason}` : '失误!',
      color: '#F44336',
    })

    this.spawnMissParticles()

    if (this.gameMode === 'tutorial' && this.tutorialEngine) {
      this.tutorialEngine.recordPractice(false)
      this.state.actionTimer = 5000
    } else {
      this.state.actionTimer = this.getTimePerAction()
    }

    if (this.gameMode === 'multiplayer') {
      this.syncCurrentPlayerState()
      this.switchToNextPlayer()
    }

    if (this.gameMode !== 'tutorial') {
      if (this.state.lives <= 0) {
        this.gameOver(false)
      } else if (this.state.missCount >= this.getMaxMistakes()) {
        this.gameOver(false)
      }
    }

    this.state.lastActionTime = performance.now()
    this.emitStateChange()
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

    if (this.gameMode === 'routine' || this.gameMode === 'custom' || this.gameMode === 'tutorial') {
      this.state.phase = 'victory'
      cancelAnimationFrame(this.animFrameId)
      this.emitStateChange()
      if (this.onGameOver) {
        this.onGameOver({
          totalScore: this.state.score,
          levelsCompleted: this.state.currentLevel,
          totalPerfect: this.state.perfectCount,
          totalGood: this.state.goodCount,
          totalMiss: this.state.missCount,
          bestCombo: this.state.maxCombo,
          victory: true,
        })
      }
      return
    }

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

    const elasticBand = updateElasticBand(this.rubberBand, dt * 0.001)
    this.rubberBand.stretchX = elasticBand.stretchX
    this.rubberBand.velocity = elasticBand.velocity
    this.rubberBand.wobble = elasticBand.wobble

    if (this.aiAssistant) {
      this.aiAssistant.update(
        { score: this.state.score, combo: this.state.combo, missCount: this.state.missCount },
        dt
      )
    }

    const beatInterval = 60000 / this.rhythmConfig.bpm
    this.beatTime = Math.floor(time / beatInterval) * beatInterval
  }

  private updateActionTimer(dt: number) {
    if (this.gameMode !== 'tutorial'
        && !this.currentLevelConfig
        && !this.currentRoutine
        && !this.customPattern) return
    this.state.actionTimer -= dt
    if (this.state.actionTimer <= 0) {
      this.handleMiss('超时')
    }
  }

  private updatePlayerAnimation(dt: number) {
    if (this.player.state !== 'idle') {
      this.playerActionDuration -= dt
      this.player.animProgress = Math.min(this.player.animProgress + dt * 0.003, 1)

      if (this.pendingAction && !this.pendingAction.resolved) {
        const currentTime = performance.now()
        const effectiveBand = this.getEffectiveRubberBand()
        const collision = checkFootRubberBandCollision(
          this.player,
          effectiveBand,
          this.pendingAction.action,
          currentTime
        )
        if (collision.distance < this.pendingAction.bestDistance) {
          this.pendingAction.bestDistance = collision.distance
        }
        if (collision.collided) {
          this.pendingAction.bestCollision = true
        }
      }

      if (this.playerActionDuration <= 0) {
        this.player.state = 'idle'
        this.player.animProgress = 0
        this.playerActionDuration = 0
        if (this.pendingAction && !this.pendingAction.resolved) {
          this.resolvePendingAction()
        }
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

    const armAngle = this.getAssistantArmAngle()
    const effectiveBand = this.getEffectiveRubberBand()

    const leftHand = drawAssistant(ctx, this.leftAssistant, armAngle, effectiveBand.y)
    const rightHand = drawAssistant(ctx, this.rightAssistant, armAngle, effectiveBand.y)

    this.rubberBand.leftX = leftHand.handX
    this.rubberBand.rightX = rightHand.handX

    drawRubberBand(ctx, effectiveBand, time)

    drawPlayer(ctx, this.player, time)
    drawParticles(ctx, this.particles)
    drawActionFeedback(ctx, this.feedbacks)

    if (this.currentLevelConfig) {
      drawHeightRuler(ctx, effectiveBand.y, effectiveBand.targetY, this.currentLevelConfig.heightLabel)
    } else if (this.currentRoutine) {
      drawHeightRuler(ctx, effectiveBand.y, effectiveBand.targetY, this.currentRoutine.heightLabel)
    }

    if (this.state.phase === 'playing') {
      const currentAction = this.getCurrentAction()
      drawActionPreviewOnCanvas(ctx, currentAction ?? null, time)
    }

    if (this.state.phase === 'playing') {
      this.drawTimerBar(ctx)
    }

    this.drawRhythmIndicator(ctx)
    this.drawAIHint(ctx)
    this.drawMultiplayerHUD(ctx)
    this.drawTutorialOverlay(ctx)
  }

  private drawRhythmIndicator(ctx: CanvasRenderingContext2D) {
    if (this.state.phase !== 'playing') return

    const barW = 200
    const barH = 6
    const barX = (CANVAS_W - barW) / 2
    const barY = 95

    const position = getBeatPosition(performance.now(), this.rhythmConfig.bpm)

    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.roundRect(barX, barY, barW, barH, 3)
    ctx.fill()

    const centerX = barX + barW / 2
    const indicatorX = barX + barW * position
    const distFromCenter = Math.abs(indicatorX - centerX) / (barW / 2)

    const color = distFromCenter < 0.15 ? '#FFD700'
      : distFromCenter < 0.35 ? '#4CAF50'
      : distFromCenter < 0.6 ? '#FF9800'
      : '#F44336'

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(indicatorX, barY + barH / 2, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(centerX, barY - 2)
    ctx.lineTo(centerX, barY + barH + 2)
    ctx.stroke()
  }

  private drawAIHint(ctx: CanvasRenderingContext2D) {
    if (!this.aiAssistant || this.state.phase !== 'playing') return

    const prediction = this.aiAssistant.predictNextAction(this.actionHistory)
    const shouldEncourage = this.aiAssistant.shouldEncourage()

    if (prediction) {
      const actionNameMap: Record<ActionType, string> = {
        step: '踩', hook: '勾', flick: '挑', wrap: '绕', jump: '跳',
      }
      ctx.save()
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(33,150,243,0.8)'
      ctx.fillText(`AI建议: ${actionNameMap[prediction]}`, CANVAS_W - 20, 30)
      ctx.restore()
    }

    if (shouldEncourage) {
      const text = this.aiAssistant.getEncouragementText()
      ctx.save()
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,215,0,0.9)'
      ctx.fillText(text, CANVAS_W / 2, 50)
      ctx.restore()
    }
  }

  private drawMultiplayerHUD(ctx: CanvasRenderingContext2D) {
    if (this.gameMode !== 'multiplayer' || this.players.length === 0) return

    ctx.save()
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'left'

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i]
      const y = 20 + i * 22
      ctx.fillStyle = i === this.currentPlayerIndex ? p.color : 'rgba(255,255,255,0.5)'
      const marker = i === this.currentPlayerIndex ? '▶ ' : '  '
      ctx.fillText(`${marker}${p.name}: ${p.score}`, 15, y)
    }

    ctx.restore()
  }

  private drawTutorialOverlay(ctx: CanvasRenderingContext2D) {
    if (this.gameMode !== 'tutorial' || !this.tutorialEngine || this.state.phase !== 'playing') return

    const step = this.tutorialEngine.getCurrentStep()
    if (!step) return

    const progress = this.tutorialEngine.getOverallProgress()

    ctx.save()

    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.beginPath()
    ctx.roundRect(20, CANVAS_H - 90, CANVAS_W - 40, 70, 10)
    ctx.fill()

    ctx.font = 'bold 16px sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText(step.instruction, CANVAS_W / 2, CANVAS_H - 65)

    if (this.tutorialEngine.showHint) {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(step.hint, CANVAS_W / 2, CANVAS_H - 45)
    }

    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.beginPath()
    ctx.roundRect(30, CANVAS_H - 35, CANVAS_W - 60, 8, 4)
    ctx.fill()

    ctx.fillStyle = '#4CAF50'
    ctx.beginPath()
    ctx.roundRect(30, CANVAS_H - 35, (CANVAS_W - 60) * progress, 8, 4)
    ctx.fill()

    ctx.restore()
  }

  private drawTimerBar(ctx: CanvasRenderingContext2D) {
    const timePerAction = this.getTimePerAction()
    if (timePerAction <= 0) return
    const barW = 300
    const barH = 8
    const barX = (CANVAS_W - barW) / 2
    const barY = 120
    const ratio = Math.max(this.state.actionTimer / timePerAction, 0)

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
    if (this.state.phase !== 'playing') return null
    if (this.gameMode === 'tutorial' && this.tutorialEngine) {
      return this.tutorialEngine.getCurrentStep()?.action ?? null
    }
    if (this.gameMode === 'routine' && this.currentRoutine) {
      return this.currentRoutine.actions[this.state.actionIndex] ?? null
    }
    if (this.gameMode === 'custom' && this.customPattern) {
      return this.customPattern.actions[this.state.actionIndex] ?? null
    }
    if (this.currentLevelConfig) {
      return this.currentLevelConfig.actions[this.state.actionIndex] ?? null
    }
    return null
  }

  getActionSequence(): ActionType[] {
    if (this.gameMode === 'tutorial' && this.tutorialEngine) {
      const step = this.tutorialEngine.getCurrentStep()
      return step ? [step.action] : []
    }
    if (this.gameMode === 'routine' && this.currentRoutine) {
      return this.currentRoutine.actions
    }
    if (this.gameMode === 'custom' && this.customPattern) {
      return this.customPattern.actions
    }
    return this.currentLevelConfig?.actions ?? []
  }

  getActionTimerRatio(): number {
    const timePerAction = this.getTimePerAction()
    if (timePerAction <= 0) return 1
    return Math.max(this.state.actionTimer / timePerAction, 0)
  }

  setTouchActionHandler(handler: (action: ActionType) => void) {
    this.touchActionHandler = handler
  }

  private getTimePerAction(): number {
    if (this.gameMode === 'tutorial') return 5000
    if (this.gameMode === 'routine' && this.currentRoutine) {
      return this.currentRoutine.timePerAction
    }
    if (this.gameMode === 'custom' && this.customPattern) {
      return this.customPattern.timePerAction
    }
    return this.currentLevelConfig?.timePerAction ?? 3000
  }

  private getTotalActions(): number {
    if (this.gameMode === 'tutorial') return 0
    if (this.gameMode === 'routine' && this.currentRoutine) {
      return this.currentRoutine.actions.length
    }
    if (this.gameMode === 'custom' && this.customPattern) {
      return this.customPattern.actions.length
    }
    return this.currentLevelConfig?.actions.length ?? 0
  }

  private getMaxMistakes(): number {
    if (this.gameMode === 'tutorial') return 999
    if (this.gameMode === 'routine' && this.currentRoutine) {
      return this.currentRoutine.maxMistakes
    }
    if (this.gameMode === 'custom' && this.customPattern) {
      return this.customPattern.maxMistakes
    }
    return this.currentLevelConfig?.maxMistakes ?? 5
  }

  private syncCurrentPlayerState() {
    if (this.gameMode !== 'multiplayer' || this.players.length === 0) return
    const p = this.players[this.currentPlayerIndex]
    p.score = this.state.score
    p.lives = this.state.lives
    p.combo = this.state.combo
    p.maxCombo = this.state.maxCombo
    p.perfectCount = this.state.perfectCount
    p.goodCount = this.state.goodCount
    p.missCount = this.state.missCount
    p.actionIndex = this.state.actionIndex
  }
}
