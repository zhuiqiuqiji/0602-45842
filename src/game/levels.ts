import type { LevelConfig, Difficulty, ActionType } from '@/types/game'

const GROUND_Y = 440
const CANVAS_HEIGHT = 540

const LEVEL_DATA: LevelConfig[] = [
  {
    level: 1,
    heightLabel: '脚踝',
    rubberBandY: GROUND_Y - 30,
    assistantArmAngle: -10,
    actions: ['step', 'jump', 'step', 'jump'],
    timePerAction: 3000,
    maxMistakes: 5,
  },
  {
    level: 2,
    heightLabel: '小腿',
    rubberBandY: GROUND_Y - 70,
    assistantArmAngle: -20,
    actions: ['step', 'hook', 'jump', 'step', 'hook', 'jump'],
    timePerAction: 2800,
    maxMistakes: 5,
  },
  {
    level: 3,
    heightLabel: '膝盖',
    rubberBandY: GROUND_Y - 110,
    assistantArmAngle: -35,
    actions: ['step', 'hook', 'flick', 'jump', 'step', 'hook', 'flick', 'jump'],
    timePerAction: 2600,
    maxMistakes: 4,
  },
  {
    level: 4,
    heightLabel: '大腿',
    rubberBandY: GROUND_Y - 150,
    assistantArmAngle: -50,
    actions: ['step', 'hook', 'flick', 'wrap', 'jump', 'step', 'hook', 'flick', 'wrap', 'jump'],
    timePerAction: 2400,
    maxMistakes: 4,
  },
  {
    level: 5,
    heightLabel: '腰部',
    rubberBandY: GROUND_Y - 190,
    assistantArmAngle: -65,
    actions: ['hook', 'flick', 'step', 'wrap', 'jump', 'flick', 'hook', 'jump'],
    timePerAction: 2200,
    maxMistakes: 3,
  },
  {
    level: 6,
    heightLabel: '胸部',
    rubberBandY: GROUND_Y - 240,
    assistantArmAngle: -80,
    actions: ['flick', 'wrap', 'hook', 'step', 'jump', 'wrap', 'flick', 'hook', 'step', 'jump'],
    timePerAction: 2000,
    maxMistakes: 3,
  },
  {
    level: 7,
    heightLabel: '肩部',
    rubberBandY: GROUND_Y - 290,
    assistantArmAngle: -95,
    actions: ['wrap', 'flick', 'hook', 'step', 'jump', 'hook', 'wrap', 'flick', 'step', 'jump', 'wrap', 'hook'],
    timePerAction: 1800,
    maxMistakes: 2,
  },
  {
    level: 8,
    heightLabel: '颈部',
    rubberBandY: GROUND_Y - 340,
    assistantArmAngle: -110,
    actions: ['wrap', 'hook', 'flick', 'step', 'jump', 'flick', 'wrap', 'hook', 'step', 'jump', 'hook', 'wrap', 'flick', 'jump'],
    timePerAction: 1600,
    maxMistakes: 2,
  },
]

export function getLevelConfig(level: number, difficulty: Difficulty): LevelConfig {
  const config = { ...LEVEL_DATA[Math.min(level - 1, LEVEL_DATA.length - 1)] }
  const multiplier = difficulty === 'easy' ? 1.5 : difficulty === 'hard' ? 0.7 : 1.0
  config.timePerAction = Math.round(config.timePerAction * multiplier)
  if (difficulty === 'easy') {
    config.maxMistakes = Math.min(config.maxMistakes + 3, 8)
  } else if (difficulty === 'hard') {
    config.maxMistakes = Math.max(config.maxMistakes - 1, 1)
  }
  return config
}

export function getTotalLevels(): number {
  return LEVEL_DATA.length
}

export function getLevelActions(level: number, difficulty: Difficulty): ActionType[] {
  const config = getLevelConfig(level, difficulty)
  return config.actions
}
