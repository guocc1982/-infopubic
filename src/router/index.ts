import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import ReadingList from '../views/ReadingList.vue';
import ContentManagement from '../views/ContentManagement.vue';
import CategoryManagement from '../views/CategoryManagement.vue';
import ArticleEditor from '../views/ArticleEditor.vue';
import ArticleDetail from '../views/ArticleDetail.vue';
import Settings from '../views/Settings.vue';
import Login from '../views/Login.vue';
import { useAuth } from '../composables/useAuth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/reading-list'
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
  },
  {
    path: '/reading-list',
    name: 'reading-list',
    component: ReadingList,
  },
  {
    path: '/content-management',
    name: 'info-list',
    component: ContentManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/category-management',
    name: 'category-mgmt',
    component: CategoryManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: '/article/new',
    name: 'article-editor-new',
    component: ArticleEditor,
    meta: { requiresAuth: true }
  },
  {
    path: '/article/edit/:id',
    name: 'article-editor-edit',
    component: ArticleEditor,
    meta: { requiresAuth: true }
  },
  {
    path: '/article/:id',
    name: 'article-detail',
    component: ArticleDetail,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth();
  
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (to.name === 'login' && isAuthenticated.value) {
    next({ name: 'reading-list' });
  } else {
    next();
  }
});

export default router;
