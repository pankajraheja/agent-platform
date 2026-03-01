import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Sign In', public: true },
  },
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
    path: '/agents/:id',
    name: 'AgentDetail',
    component: () => import('../views/AgentDetailView.vue'),
    meta: { title: 'Agent Detail' },
  },
  {
    path: '/skills',
    name: 'Skills',
    component: () => import('../views/SkillsView.vue'),
    meta: { title: 'Skills Library' },
  },
  {
    path: '/connectors',
    name: 'Connectors',
    component: () => import('../views/ConnectorsView.vue'),
    meta: { title: 'Connector Hub' },
  },
  {
    path: '/connectors/:id',
    name: 'ConnectorDetail',
    component: () => import('../views/ConnectorDetailView.vue'),
    meta: { title: 'Connector Detail' },
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

// Navigation guard — redirect to /login if not authenticated
router.beforeEach((to) => {
  if (to.meta.public) return true

  const auth = useAuthStore()
  if (!auth.token) {
    return { name: 'Login' }
  }
  return true
})

// Update page title
router.afterEach((to) => {
  document.title = `${to.meta.title || 'Home'} — Agent Platform`
})

export default router
