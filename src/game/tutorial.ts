import type { ActionType, TutorialStep, TutorialConfig } from '@/types/game'

const TUTORIAL_STEPS_DATA: { action: ActionType; instruction: string; hint: string; practiceRounds: number }[] = [
  { action: 'step', instruction: '踩皮筋', hint: '用↓键踩在皮筋上', practiceRounds: 3 },
  { action: 'hook', instruction: '勾皮筋', hint: '用↑键从下方勾住皮筋', practiceRounds: 3 },
  { action: 'flick', instruction: '挑皮筋', hint: '用→键从下方挑起皮筋', practiceRounds: 3 },
  { action: 'wrap', instruction: '绕皮筋', hint: '用←键让脚绕过皮筋', practiceRounds: 3 },
  { action: 'jump', instruction: '跳过皮筋', hint: '用空格键跳过皮筋', practiceRounds: 3 },
]

export class TutorialEngine {
  config: TutorialConfig
  currentAction: ActionType | null
  practiceCount: number
  showHint: boolean

  constructor() {
    this.config = this.createTutorial()
    this.currentAction = this.config.steps[0]?.action ?? null
    this.practiceCount = 0
    this.showHint = true
  }

  createTutorial(): TutorialConfig {
    const steps: TutorialStep[] = TUTORIAL_STEPS_DATA.map(data => ({
      action: data.action,
      instruction: data.instruction,
      hint: data.hint,
      practiceRounds: data.practiceRounds,
      completed: 0,
    }))

    return {
      steps,
      currentStepIndex: 0,
      isPractice: true,
      showGuide: true,
    }
  }

  getCurrentStep(): TutorialStep | null {
    if (this.config.currentStepIndex >= this.config.steps.length) return null
    return this.config.steps[this.config.currentStepIndex]
  }

  advanceStep(): boolean {
    if (this.config.currentStepIndex >= this.config.steps.length - 1) return false
    this.config.currentStepIndex++
    this.currentAction = this.config.steps[this.config.currentStepIndex].action
    this.practiceCount = 0
    this.showHint = true
    return true
  }

  recordPractice(success: boolean): void {
    if (success) {
      const step = this.getCurrentStep()
      if (step) {
        step.completed++
      }
    }
    this.practiceCount++
    this.showHint = false
  }

  isStepComplete(): boolean {
    const step = this.getCurrentStep()
    if (!step) return false
    return step.completed >= step.practiceRounds
  }

  isTutorialComplete(): boolean {
    if (this.config.currentStepIndex < this.config.steps.length - 1) return false
    return this.isStepComplete()
  }

  getStepProgress(): number {
    const step = this.getCurrentStep()
    if (!step) return 1
    return Math.min(step.completed / step.practiceRounds, 1)
  }

  getOverallProgress(): number {
    if (this.config.steps.length === 0) return 1
    const completedSteps = this.config.steps.filter(s => s.completed >= s.practiceRounds).length
    const currentStepPartial = this.getStepProgress()
    const fullProgress = completedSteps + currentStepPartial
    return Math.min(fullProgress / this.config.steps.length, 1)
  }

  reset(): void {
    this.config = this.createTutorial()
    this.currentAction = this.config.steps[0]?.action ?? null
    this.practiceCount = 0
    this.showHint = true
  }
}
