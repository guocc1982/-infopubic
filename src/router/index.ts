import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import ReadingList from '../views/ReadingList.vue';
import ContentManagement from '../views/ContentManagement.vue';
import CategoryManagement from '../views/CategoryManagement.vue';
import ArticleEditor from '../views/ArticleEditor.vue';
import ArticleDetail from '../views/ArticleDetail.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/reading-list'
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
  },
  {
    path: '/category-management',
    name: 'category-mgmt',
    component: CategoryManagement,
  },
  {
    path: '/article/new',
    name: 'article-editor-new',
    component: ArticleEditor,
  },
  {
    path: '/article/edit/:id',
    name: 'article-editor-edit',
    component: ArticleEditor,
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

export default router;
