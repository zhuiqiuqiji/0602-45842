export type ActionType = 'step' | 'hook' | 'flick' | 'wrap' | 'jump'

export type GamePhase = 'ready' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'victory'

export type Difficulty = 'easy' | 'normal' | 'hard'

export type ActionGrade = 'perfect' | 'good' | 'miss'

export type CharacterState = 'idle' | 'jumping' | 'stepping' | 'hooking' | 'flicking' | 'wrapping'

export type GameMode = 'classic' | 'routine' | 'custom' | 'multiplayer' | 'tutorial' | 'competition'

export type RhythmGrade = 'perfect' | 'good' | 'early' | 'late' | 'miss'

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
  gameMode: GameMode
  currentPlayerIndex: number
  rhythmGrade: RhythmGrade
  bandElasticity: number
  bandRecoilForce: number
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
  elasticity: number
  recoilForce: number
  stretchX: number
  velocity: number
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
  isAI: boolean
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

export interface RoutineDef {
  id: string
  name: string
  description: string
  origin: string
  difficulty: Difficulty
  actions: ActionType[]
  heightLabel: string
  rubberBandY: number
  assistantArmAngle: number
  timePerAction: number
  maxMistakes: number
  isTraditional: boolean
}

export interface CustomPattern {
  id: string
  name: string
  actions: ActionType[]
  difficulty: Difficulty
  timePerAction: number
  maxMistakes: number
  createdAt: number
  updatedAt: number
}

export interface PlayerInfo {
  id: number
  name: string
  color: string
  score: number
  lives: number
  combo: number
  maxCombo: number
  perfectCount: number
  goodCount: number
  missCount: number
  actionIndex: number
  isActive: boolean
}

export interface TutorialStep {
  action: ActionType
  instruction: string
  hint: string
  practiceRounds: number
  completed: number
}

export interface TutorialConfig {
  steps: TutorialStep[]
  currentStepIndex: number
  isPractice: boolean
  showGuide: boolean
}

export interface CompetitionEntry {
  rank: number
  name: string
  score: number
  level: number
  combo: number
  date: string
  isPlayer: boolean
}

export interface CompetitionState {
  entries: CompetitionEntry[]
  playerEntry: CompetitionEntry | null
  challengeActive: boolean
  challengeScore: number
  challengeTimeLeft: number
}

export interface RhythmConfig {
  bpm: number
  windowPerfect: number
  windowGood: number
  windowEarly: number
  windowLate: number
}

export interface ElasticBandConfig {
  stiffness: number
  damping: number
  maxStretch: number
  recoilSpeed: number
}

export interface HeightObstacle {
  minHeight: number
  maxHeight: number
  label: string
  requiredJumpHeight: number
}
