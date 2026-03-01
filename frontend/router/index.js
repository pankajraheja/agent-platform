import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: 'Dashboard' },
  },
  {
    path: '/agents',
    name: 'Agents',
    component: () => import('../views/AgentsView.vue'),
    meta: { title: 'Agents' },
  },
  {
    path: '/skills',
    name: 'Skills',
    component: () => import('../views/SkillsView.vue'),
    meta: { title: 'Skills Library' },
  },
  {
    path: '/skills/:id',
    name: 'SkillDetail',
    component: () => import('../views/SkillDetailView.vue'),
    meta: { title: 'Skill Detail' },
  },
  {
    path: '/connectors',
    name: 'Connectors',
    component: () => import('../views/ConnectorsView.vue'),
    meta: { title: 'Connector Hub' },
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('../views/TemplatesView.vue'),
    meta: { title: 'Template Gallery' },
  },
  {
    path: '/personas',
    name: 'Personas',
    component: () => import('../views/PersonasView.vue'),
    meta: { title: 'Personas' },
  },
  {
    path: '/runs',
    name: 'Runs',
    component: () => import('../views/RunsView.vue'),
    meta: { title: 'Agent Runs' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Update page title
router.afterEach((to) => {
  document.title = `${to.meta.title || 'Home'} — Agent Platform`
})

export default router
