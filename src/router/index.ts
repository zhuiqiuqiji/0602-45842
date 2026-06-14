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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
