import type { Difficulty } from '@/types/game'

export interface HighScore {
  difficulty: Difficulty
  score: number
  level: number
  date: string
}

const STORAGE_KEY = 'rubber-band-game-scores'

export function useStorage() {
  function getHighScores(): HighScore[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  function saveHighScore(score: HighScore): boolean {
    const scores = getHighScores()
    const existing = scores.find(s => s.difficulty === score.difficulty)
    if (existing && existing.score >= score.score) {
      return false
    }
    if (existing) {
      existing.score = score.score
      existing.level = score.level
      existing.date = score.date
    } else {
      scores.push(score)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
    return true
  }

  function getBestScore(difficulty: Difficulty): number {
    const scores = getHighScores()
    const found = scores.find(s => s.difficulty === difficulty)
    return found?.score ?? 0
  }

  return {
    getHighScores,
    saveHighScore,
    getBestScore,
  }
}
