
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('src/pages/PageDashboard.vue') },
      { path: 'ibindex', component: () => import('src/pages/PageIbindex.vue') },
      { path: 'ibindex-weights', component: () => import('src/pages/PageIbindexWeights.vue') },
      { path: 'funds', component: () => import('src/pages/PageFunds.vue') }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/Error404.vue')
  }
]

export default routes
