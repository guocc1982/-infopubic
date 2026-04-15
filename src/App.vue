<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { 
  LayoutDashboard, 
  BookOpen, 
  Settings, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight,
  Search,
  FileText,
  FolderTree,
  ArrowLeft,
  Languages,
  Building2,
  LogOut,
  LogIn,
  FileCode,
  MessageSquare
} from 'lucide-vue-next';
import { useData } from './composables/useData';
import { useAuth } from './composables/useAuth';
import { useApi } from './composables/useApi';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const { tenantId, setTenantId, searchQuery, currentArticleTitle } = useData();
const { user, isAuthenticated, logout } = useAuth();
const { apiFetch } = useApi();
const isSidebarCollapsed = ref(false);

const systemSettings = ref({
  site_name: 'Hub CMS',
  theme: 'light',
  primary_color: '#4f46e5'
});

provide('systemSettings', systemSettings);

const fetchSystemSettings = async () => {
  try {
    const res = await apiFetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      systemSettings.value = { ...systemSettings.value, ...data };
      applyGlobalSettings();
    }
  } catch (error) {
    console.error('Failed to fetch system settings:', error);
  }
};

const applyGlobalSettings = () => {
  // Apply theme
  if (systemSettings.value.theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Apply primary color (CSS variable)
  document.documentElement.style.setProperty('--primary-color', systemSettings.value.primary_color);
};

onMounted(() => {
  fetchSystemSettings();
  window.addEventListener('settings-updated', (e: any) => {
    systemSettings.value = { ...systemSettings.value, ...e.detail };
    applyGlobalSettings();
  });
});

const tenants = [
  { id: 'default', name: 'Default Tenant' },
  { id: 'tenant1', name: 'Tenant A' },
  { id: 'tenant2', name: 'Tenant B' }
];

const handleTenantChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  setTenantId(target.value);
  fetchSystemSettings(); // Re-fetch settings for new tenant
};

const toggleLanguage = () => {
  locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN';
  localStorage.setItem('locale', locale.value);
};

const currentView = computed(() => {
  if (route.path === '/reading-list') return 'reading-list';
  if (route.path === '/content-management') return 'info-list';
  if (route.path === '/category-management') return 'category-mgmt';
  if (route.path === '/comments') return 'comment-mgmt';
  if (route.path === '/settings') return 'settings';
  if (route.path.startsWith('/article/')) {
    if (route.path.includes('/edit/') || route.path.endsWith('/new')) return 'article-editor';
    return 'article-detail';
  }
  return '';
});

const pageTitle = computed(() => {
  switch (currentView.value) {
    case 'reading-list': return t('nav.readingList');
    case 'info-list': return t('nav.contentManagement');
    case 'category-mgmt': return t('nav.categoryManagement');
    case 'comment-mgmt': return t('nav.commentManagement');
    case 'settings': return t('nav.settings');
    case 'article-detail': return currentArticleTitle.value || t('article.noTitle');
    case 'article-editor': return route.params.id ? t('common.edit') : t('common.publish');
    default: return systemSettings.value.site_name;
  }
});

const handleLogout = () => {
  logout();
  router.push('/login');
};

const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<template>
  <div class="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
    <!-- Sidebar -->
    <aside 
      v-if="route.name !== 'login'"
      :class="[
        'bg-white border-r border-slate-200 transition-all duration-300 flex flex-col',
        isSidebarCollapsed ? 'w-20' : 'w-64'
      ]"
    >
      <div class="p-6 flex items-center justify-between border-b border-slate-100">
        <div v-if="!isSidebarCollapsed" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white" :style="{ backgroundColor: systemSettings.primary_color }">
            <LayoutDashboard :size="20" />
          </div>
          <span class="font-bold text-lg tracking-tight">{{ systemSettings.site_name }}</span>
        </div>
        <button 
          @click="isSidebarCollapsed = !isSidebarCollapsed"
          class="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
        >
          <ChevronLeft v-if="!isSidebarCollapsed" :size="20" />
          <ChevronRight v-else :size="20" />
        </button>
      </div>

      <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
        <router-link 
          to="/reading-list"
          :class="[
            'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
            currentView === 'reading-list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
          ]"
          :style="currentView === 'reading-list' ? { color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)` } : {}"
        >
          <BookOpen :size="20" :class="currentView === 'reading-list' ? '' : 'group-hover:text-indigo-500'" :style="currentView === 'reading-list' ? { color: systemSettings.primary_color } : {}" />
          <span v-if="!isSidebarCollapsed" class="font-medium">{{ t('nav.readingList') }}</span>
        </router-link>

        <router-link 
          to="/content-management"
          :class="[
            'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
            currentView === 'info-list' || currentView === 'article-editor' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
          ]"
          :style="currentView === 'info-list' || currentView === 'article-editor' ? { color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)` } : {}"
        >
          <FileText :size="20" :class="currentView === 'info-list' || currentView === 'article-editor' ? '' : 'group-hover:text-indigo-500'" :style="currentView === 'info-list' || currentView === 'article-editor' ? { color: systemSettings.primary_color } : {}" />
          <span v-if="!isSidebarCollapsed" class="font-medium">{{ t('nav.contentManagement') }}</span>
        </router-link>

        <router-link 
          to="/category-management"
          :class="[
            'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
            currentView === 'category-mgmt' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
          ]"
          :style="currentView === 'category-mgmt' ? { color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)` } : {}"
        >
          <FolderTree :size="20" :class="currentView === 'category-mgmt' ? '' : 'group-hover:text-indigo-500'" :style="currentView === 'category-mgmt' ? { color: systemSettings.primary_color } : {}" />
          <span v-if="!isSidebarCollapsed" class="font-medium">{{ t('nav.categoryManagement') }}</span>
        </router-link>

        <router-link 
          to="/comments"
          :class="[
            'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
            currentView === 'comment-mgmt' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
          ]"
          :style="currentView === 'comment-mgmt' ? { color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)` } : {}"
        >
          <MessageSquare :size="20" :class="currentView === 'comment-mgmt' ? '' : 'group-hover:text-indigo-500'" :style="currentView === 'comment-mgmt' ? { color: systemSettings.primary_color } : {}" />
          <span v-if="!isSidebarCollapsed" class="font-medium">{{ t('nav.commentManagement') }}</span>
        </router-link>

        <a 
          href="/swagger-ui/index.html"
          target="_blank"
          :class="[
            'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group text-slate-500 hover:bg-slate-50'
          ]"
        >
          <FileCode :size="20" class="group-hover:text-indigo-500" />
          <span v-if="!isSidebarCollapsed" class="font-medium">API {{ t('common.docs') || 'Docs' }}</span>
        </a>
      </nav>

      <div class="p-4 border-t border-slate-100 space-y-2">
        <button 
          @click="toggleLanguage"
          class="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all group"
        >
          <Languages :size="20" class="group-hover:text-indigo-500" />
          <span v-if="!isSidebarCollapsed" class="font-medium">{{ locale === 'zh-CN' ? 'English' : '简体中文' }}</span>
        </button>

        <div class="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 group">
          <Building2 :size="20" class="group-hover:text-indigo-500 shrink-0" />
          <select 
            v-if="!isSidebarCollapsed"
            :value="tenantId"
            @change="handleTenantChange"
            class="bg-transparent border-none focus:ring-0 text-sm font-medium w-full cursor-pointer"
          >
            <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

        <div v-if="!isSidebarCollapsed" class="bg-slate-50 rounded-2xl p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white overflow-hidden">
              <img :src="`https://picsum.photos/seed/${user?.username || 'user'}/100/100`" alt="Avatar" referrerPolicy="no-referrer" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">{{ user?.display_name || 'Guest' }}</p>
              <p class="text-xs text-slate-400 truncate">{{ user?.role || t('common.guest') }}</p>
            </div>
          </div>
          <div class="space-y-1">
            <button 
              @click="navigateTo('/settings')"
              :class="[
                'w-full flex items-center gap-2 p-2 text-xs font-medium transition-colors rounded-lg',
                currentView === 'settings' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
              ]"
              :style="currentView === 'settings' ? { color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)` } : {}"
            >
              <Settings :size="14" />
              {{ t('nav.settings') }}
            </button>
            <button 
              v-if="isAuthenticated"
              @click="handleLogout"
              class="w-full flex items-center gap-2 p-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut :size="14" />
              {{ t('common.logout') || 'Logout' }}
            </button>
            <button 
              v-else
              @click="navigateTo('/login')"
              class="w-full flex items-center gap-2 p-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              :style="{ color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)` }"
            >
              <LogIn :size="14" />
              {{ t('common.login') || 'Login' }}
            </button>
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white overflow-hidden cursor-pointer">
            <img :src="`https://picsum.photos/seed/${user?.username || 'user'}/100/100`" alt="Avatar" referrerPolicy="no-referrer" />
          </div>
          <button 
            v-if="isAuthenticated"
            @click="handleLogout"
            class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            :title="t('common.logout') || 'Logout'"
          >
            <LogOut :size="18" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <header v-if="currentView !== 'article-editor'" class="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
          <button 
            v-if="currentView === 'article-detail'"
            @click="router.push('/reading-list')"
            class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft :size="20" />
          </button>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ pageTitle }}
          </h1>
        </div>

        <div class="flex items-center gap-4">
          <div class="relative hidden md:block">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" :size="18" />
            <input 
              v-model="searchQuery"
              type="text" 
              :placeholder="t('common.search')"
              class="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
            />
          </div>
          <button 
            v-if="currentView === 'info-list'"
            @click="navigateTo('/article/new')"
            class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm shadow-indigo-200"
            :style="{ backgroundColor: systemSettings.primary_color }"
          >
            <PlusCircle :size="18" />
            {{ t('common.publish') }}
          </button>
        </div>
      </header>

      <!-- View Area -->
      <div class="flex-1 overflow-y-auto p-8">
        <div class="max-w-7xl mx-auto">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Hide header in editor view as it has its own header */
.article-editor-view header {
  display: none;
}
</style>
