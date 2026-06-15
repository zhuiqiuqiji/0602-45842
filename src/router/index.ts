import { createRouter, createWebHistory } from 'vue-router'
import StartView from '@/pages/StartView.vue'

const routes = [
  {
    path: '/',
    name: 'start',
    component: StartView,
  },
  {
    path: '/game',
    name: 'game',
    component: () => import('@/pages/GameView.vue'),
  },
  {
    path: '/tutorial',
    name: 'tutorial',
    component: () => import('@/pages/TutorialView.vue'),
  },
  {
    path: '/competition',
    name: 'competition',
    component: () => import('@/pages/CompetitionView.vue'),
  },
  {
    path: '/editor',
    name: 'editor',
    component: () => import('@/pages/PatternEditor.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
