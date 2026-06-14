export type ActionType = 'step' | 'hook' | 'flick' | 'wrap' | 'jump'

export type GamePhase = 'ready' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'victory'

export type Difficulty = 'easy' | 'normal' | 'hard'

export type ActionGrade = 'perfect' | 'good' | 'miss'

export type CharacterState = 'idle' | 'jumping' | 'stepping' | 'hooking' | 'flicking' | 'wrapping'

export interface ActionDef {
  type: ActionType
  name: string
  key: string
  icon: string
  color: string
}

export interface LevelConfig {
  level: number
  heightLabel: string
  rubberBandY: number
  assistantArmAngle: number
  actions: ActionType[]
  timePerAction: number
  maxMistakes: number
}

export interface GameState {
  phase: GamePhase
  currentLevel: number
  score: number
  lives: number
  maxLives: number
  combo: number
  maxCombo: number
  actionIndex: number
  perfectCount: number
  goodCount: number
  missCount: number
  difficulty: Difficulty
  lastActionTime: number
  actionTimer: number
}

export interface LevelResult {
  level: number
  perfectCount: number
  goodCount: number
  missCount: number
  maxCombo: number
  score: number
  passed: boolean
}

export interface GameResult {
  totalScore: number
  levelsCompleted: number
  totalPerfect: number
  totalGood: number
  totalMiss: number
  bestCombo: number
  victory: boolean
}

export interface RubberBandState {
  leftX: number
  rightX: number
  y: number
  targetY: number
  wobble: number
  wobbleSpeed: number
  wobbleDecay: number
}

export interface CharacterRenderState {
  x: number
  y: number
  state: CharacterState
  animProgress: number
  facingRight: boolean
  jumpHeight: number
  legAngle: number
  armAngle: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface CloudState {
  x: number
  y: number
  width: number
  speed: number
  opacity: number
}

export interface ActionFeedback {
  grade: ActionGrade
  x: number
  y: number
  opacity: number
  scale: number
  text: string
  color: string
}
