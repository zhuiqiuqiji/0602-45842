import type { Difficulty, ActionType } from '@/types/game'

const DIFFICULTY_CONFIG: Record<Difficulty, { adaptRate: number; predictionAccuracy: number }> = {
  easy: { adaptRate: 0.3, predictionAccuracy: 0.9 },
  normal: { adaptRate: 0.5, predictionAccuracy: 0.7 },
  hard: { adaptRate: 0.8, predictionAccuracy: 0.4 },
}

const ENCOURAGEMENT_TEXTS = ['太棒了!', '继续保持!', '加油!']

const ACTION_SEQUENCE: ActionType[] = ['step', 'hook', 'flick', 'wrap', 'jump']

export class AIAssistant {
  targetArmAngle: number
  currentArmAngle: number
  adaptRate: number
  predictionAccuracy: number
  performance: { score: number; combo: number; missCount: number }

  constructor(difficulty: Difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty]
    this.targetArmAngle = 10
    this.currentArmAngle = 10
    this.adaptRate = config.adaptRate
    this.predictionAccuracy = config.predictionAccuracy
    this.performance = { score: 0, combo: 0, missCount: 0 }
  }

  update(playerPerformance: { score: number; combo: number; missCount: number }, dt: number): void {
    this.performance = { ...playerPerformance }

    const performanceRatio = this.performance.combo > 0
      ? this.performance.combo / (this.performance.combo + this.performance.missCount + 1)
      : 0

    if (performanceRatio > 0.6) {
      this.targetArmAngle += this.adaptRate * dt * 0.01
    } else if (performanceRatio < 0.3) {
      this.targetArmAngle -= this.adaptRate * dt * 0.008
      this.targetArmAngle = Math.max(this.targetArmAngle, 5)
    }

    const diff = this.targetArmAngle - this.currentArmAngle
    this.currentArmAngle += diff * this.adaptRate * 0.05
  }

  getTargetArmAngle(): number {
    return this.targetArmAngle
  }

  predictNextAction(actionHistory: ActionType[]): ActionType | null {
    if (actionHistory.length < 3) return null

    if (Math.random() > this.predictionAccuracy) return null

    const lastThree = actionHistory.slice(-3)
    const patternKey = lastThree.join(',')

    const patternCounts: Record<string, Record<string, number>> = {}
    for (let i = 0; i < actionHistory.length - 3; i++) {
      const key = actionHistory.slice(i, i + 3).join(',')
      const nextAction = actionHistory[i + 3]
      if (!patternCounts[key]) patternCounts[key] = {}
      patternCounts[key][nextAction] = (patternCounts[key][nextAction] || 0) + 1
    }

    const nextCounts = patternCounts[patternKey]
    if (!nextCounts) {
      const lastIndex = ACTION_SEQUENCE.indexOf(actionHistory[actionHistory.length - 1])
      const nextIndex = (lastIndex + 1) % ACTION_SEQUENCE.length
      return ACTION_SEQUENCE[nextIndex]
    }

    let bestAction: ActionType | null = null
    let bestCount = 0
    for (const [action, count] of Object.entries(nextCounts)) {
      if (count > bestCount) {
        bestCount = count
        bestAction = action as ActionType
      }
    }

    return bestAction
  }

  getAdaptiveTimeBonus(): number {
    if (this.performance.missCount > this.performance.combo) {
      return 300
    }
    if (this.performance.combo >= 8) {
      return -100
    }
    return 0
  }

  shouldEncourage(): boolean {
    return this.performance.combo >= 5
  }

  getEncouragementText(): string {
    return ENCOURAGEMENT_TEXTS[Math.floor(Math.random() * ENCOURAGEMENT_TEXTS.length)]
  }
}
