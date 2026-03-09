import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/reading-list'
  },
  {
    path: '/reading-list',
    name: 'reading-list',
    component: () => import('../App.vue'),
  },
  {
    path: '/content-management',
    name: 'info-list',
    component: () => import('../App.vue'),
  },
  {
    path: '/category-management',
    name: 'category-mgmt',
    component: () => import('../App.vue'),
  },
  {
    path: '/article/new',
    name: 'article-editor-new',
    component: () => import('../App.vue'),
  },
  {
    path: '/article/edit/:id',
    name: 'article-editor-edit',
    component: () => import('../App.vue'),
  },
  {
    path: '/article/:id',
    name: 'article-detail',
    component: () => import('../App.vue'),
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
