
const routes = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/PageDashboard.vue') },
      { path: 'ibindex', component: () => import('../pages/PageIbindex.vue') },
      { path: 'funds', component: () => import('../pages/PageFunds.vue') },
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/PageDashboard.vue')
  }
]

export default routes
