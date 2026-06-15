import type { RoutineDef, Difficulty } from '@/types/game'

const GROUND_Y = 440

const ROUTINES: RoutineDef[] = [
  {
    id: 'xiaoma-guohe',
    name: '小马过河',
    description: '经典入门套路，节奏舒缓，适合初学者感受皮筋的弹性与跳跃的基本韵律',
    origin: '全国各地',
    difficulty: 'easy',
    actions: ['step', 'step', 'jump', 'jump', 'step', 'jump'],
    heightLabel: '脚踝',
    rubberBandY: GROUND_Y - 30,
    assistantArmAngle: -10,
    timePerAction: 3500,
    maxMistakes: 6,
    isTraditional: true,
  },
  {
    id: 'liuhulan',
    name: '刘胡兰',
    description: '以英雄人物命名的传统套路，节奏稍快，需要在步伐间穿插勾腿动作',
    origin: '华北地区',
    difficulty: 'normal',
    actions: ['step', 'hook', 'step', 'hook', 'jump', 'step', 'hook', 'jump'],
    heightLabel: '小腿',
    rubberBandY: GROUND_Y - 70,
    assistantArmAngle: -20,
    timePerAction: 3200,
    maxMistakes: 5,
    isTraditional: true,
  },
  {
    id: 'malanhua',
    name: '马兰花',
    description: '取自民谣的马兰花套路，加入挑筋动作，节奏明快如花开般流畅',
    origin: '西北地区',
    difficulty: 'hard',
    actions: ['step', 'hook', 'flick', 'step', 'hook', 'flick', 'jump', 'step', 'jump'],
    heightLabel: '膝盖',
    rubberBandY: GROUND_Y - 110,
    assistantArmAngle: -35,
    timePerAction: 2900,
    maxMistakes: 5,
    isTraditional: true,
  },
  {
    id: 'yiwu-yishiwu',
    name: '一五一十五',
    description: '数数节奏套路，步法与缠筋交替进行，考验连续操作的稳定性',
    origin: '华东地区',
    difficulty: 'hard',
    actions: ['step', 'hook', 'flick', 'wrap', 'step', 'hook', 'flick', 'wrap', 'jump', 'jump'],
    heightLabel: '大腿',
    rubberBandY: GROUND_Y - 150,
    assistantArmAngle: -50,
    timePerAction: 2600,
    maxMistakes: 4,
    isTraditional: true,
  },
  {
    id: 'erba-erwuliu',
    name: '二八二五六',
    description: '口诀类套路代表，动作组合丰富，需要快速切换勾挑缠步四种技法',
    origin: '东北地区',
    difficulty: 'hard',
    actions: ['hook', 'flick', 'wrap', 'step', 'hook', 'flick', 'wrap', 'step', 'jump', 'hook', 'jump'],
    heightLabel: '腰部',
    rubberBandY: GROUND_Y - 190,
    assistantArmAngle: -65,
    timePerAction: 2300,
    maxMistakes: 3,
    isTraditional: true,
  },
  {
    id: 'xiaopiqiu',
    name: '小皮球',
    description: '以皮球弹跳为意象的专业套路，挑缠勾步循环交替，节奏紧凑不留喘息',
    origin: '华南地区',
    difficulty: 'hard',
    actions: ['flick', 'wrap', 'hook', 'step', 'flick', 'wrap', 'hook', 'step', 'jump', 'flick', 'jump', 'wrap'],
    heightLabel: '胸部',
    rubberBandY: GROUND_Y - 240,
    assistantArmAngle: -80,
    timePerAction: 2000,
    maxMistakes: 3,
    isTraditional: true,
  },
  {
    id: 'diandian-banjiu',
    name: '点点斑鸠',
    description: '以斑鸠轻点枝头为意境的大师套路，缠勾挑步跳跃环环相扣，要求极高的精准度',
    origin: '西南地区',
    difficulty: 'hard',
    actions: ['wrap', 'hook', 'flick', 'step', 'jump', 'wrap', 'hook', 'flick', 'step', 'jump', 'hook', 'wrap', 'jump'],
    heightLabel: '肩部',
    rubberBandY: GROUND_Y - 290,
    assistantArmAngle: -95,
    timePerAction: 1800,
    maxMistakes: 2,
    isTraditional: true,
  },
  {
    id: 'bianhualan',
    name: '编花篮',
    description: '传说级套路，取编花篮之意象，四技全开连贯不息，唯有顶尖高手方可驾驭',
    origin: '中原地区',
    difficulty: 'hard',
    actions: ['wrap', 'flick', 'hook', 'step', 'wrap', 'flick', 'hook', 'step', 'jump', 'wrap', 'hook', 'flick', 'step', 'jump'],
    heightLabel: '颈部',
    rubberBandY: GROUND_Y - 340,
    assistantArmAngle: -110,
    timePerAction: 1600,
    maxMistakes: 2,
    isTraditional: true,
  },
]

export function getRoutineList(): RoutineDef[] {
  return ROUTINES
}

export function getRoutineById(id: string): RoutineDef | undefined {
  return ROUTINES.find(r => r.id === id)
}

export function getRoutinesByDifficulty(difficulty: Difficulty): RoutineDef[] {
  return ROUTINES.filter(r => r.difficulty === difficulty)
}
