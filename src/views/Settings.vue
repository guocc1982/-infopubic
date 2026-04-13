<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  Save, 
  Globe, 
  Shield, 
  Database, 
  Bell, 
  Palette,
  Layout,
  Mail,
  Smartphone,
  User
} from 'lucide-vue-next';
import { useApi } from '../composables/useApi';
import { useAuth } from '../composables/useAuth';

const { t } = useI18n();
const { apiFetch } = useApi();
const { user, updateUser } = useAuth();

const activeTab = ref('general');
const isLoading = ref(false);

const profileForm = ref({
  display_name: user.value?.display_name || '',
  password: '',
  confirm_password: ''
});

const settings = ref({
  site_name: 'Hub CMS',
  site_description: 'A modern content management system',
  allow_registration: true,
  default_role: 'user',
  enable_comments: true,
  require_comment_approval: false,
  email_notifications: true,
  push_notifications: false,
  theme: 'light',
  primary_color: '#4f46e5',
  language: 'zh-CN',
  timezone: 'UTC+8'
});

const fetchSettings = async () => {
  isLoading.value = true;
  try {
    const res = await apiFetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      settings.value = { ...settings.value, ...data };
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
  } finally {
    isLoading.value = false;
  }
};

const saveSettings = async () => {
  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings.value)
    });
    if (res.ok) {
      alert(t('common.saveSuccess') || 'Settings saved successfully!');
      // Apply settings immediately (e.g. site name)
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings.value }));
    } else {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returned ${res.status}`);
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert(`${t('settings.saveError') || 'Failed to save settings'}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const saveProfile = async () => {
  if (profileForm.value.password && profileForm.value.password !== profileForm.value.confirm_password) {
    alert(t('settings.profile.passwordMismatch') || 'Passwords do not match');
    return;
  }

  try {
    const res = await apiFetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: profileForm.value.display_name,
        password: profileForm.value.password || undefined
      })
    });
    if (res.ok) {
      const data = await res.json();
      updateUser(data.user);
      alert(t('settings.profile.saveSuccess') || 'Profile updated successfully!');
      profileForm.value.password = '';
      profileForm.value.confirm_password = '';
    } else {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returned ${res.status}`);
    }
  } catch (error) {
    console.error('Failed to save profile:', error);
    alert(`${t('settings.profile.saveError') || 'Failed to save profile'}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

onMounted(() => {
  fetchSettings();
});

const tabs = [
  { id: 'profile', name: t('settings.tabs.profile'), icon: User },
  { id: 'general', name: t('settings.tabs.general'), icon: Globe },
  { id: 'security', name: t('settings.tabs.security'), icon: Shield },
  { id: 'appearance', name: t('settings.tabs.appearance'), icon: Palette },
  { id: 'notifications', name: t('settings.tabs.notifications'), icon: Bell },
  { id: 'advanced', name: t('settings.tabs.advanced'), icon: Database },
];
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">{{ t('nav.settings') }}</h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('nav.settingsDesc') }}</p>
      </div>
      <button 
        @click="activeTab === 'profile' ? saveProfile() : saveSettings()"
        class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-100"
        :style="{ backgroundColor: settings.primary_color }"
      >
        <Save :size="18" />
        {{ t('common.save') }}
      </button>
    </div>

    <div class="flex flex-col md:flex-row gap-8">
      <!-- Sidebar Tabs -->
      <aside class="w-full md:w-64 shrink-0">
        <nav class="space-y-1">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left',
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
            ]"
            :style="activeTab === tab.id ? { color: settings.primary_color } : {}"
          >
            <component :is="tab.icon" :size="18" />
            {{ tab.name }}
          </button>
        </nav>
      </aside>

      <!-- Settings Content -->
      <div class="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-8">
          <!-- Profile Settings -->
          <div v-if="activeTab === 'profile'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="grid gap-6">
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.profile.username') }} ({{ t('settings.profile.immutable') }})</label>
                <input 
                  :value="user?.username"
                  type="text"
                  disabled
                  class="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.profile.displayName') }}</label>
                <input 
                  v-model="profileForm.display_name"
                  type="text"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.profile.newPassword') }}</label>
                  <input 
                    v-model="profileForm.password"
                    type="password"
                    :placeholder="t('settings.profile.passwordPlaceholder')"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.profile.confirmPassword') }}</label>
                  <input 
                    v-model="profileForm.confirm_password"
                    type="password"
                    class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- General Settings -->
          <div v-if="activeTab === 'general'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="grid gap-6">
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.general.siteName') }}</label>
                <input 
                  v-model="settings.site_name"
                  type="text"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.general.siteDescription') }}</label>
                <textarea 
                  v-model="settings.site_description"
                  rows="3"
                  class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                ></textarea>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.general.language') }}</label>
                  <select v-model="settings.language" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.general.timezone') }}</label>
                  <select v-model="settings.timezone" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                    <option value="UTC+8">UTC+8 ({{ t('settings.general.beijing') }})</option>
                    <option value="UTC+0">UTC+0 ({{ t('settings.general.london') }})</option>
                    <option value="UTC-5">UTC-5 ({{ t('settings.general.newYork') }})</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Settings -->
          <div v-if="activeTab === 'security'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm" :style="{ color: settings.primary_color }">
                    <Layout :size="20" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">{{ t('settings.security.allowRegistration') }}</p>
                    <p class="text-xs text-slate-500">{{ t('settings.security.allowRegistrationDesc') }}</p>
                  </div>
                </div>
                <input type="checkbox" v-model="settings.allow_registration" class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" :style="{ color: settings.primary_color }" />
              </div>

              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm" :style="{ color: settings.primary_color }">
                    <Shield :size="20" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">{{ t('settings.security.commentApproval') }}</p>
                    <p class="text-xs text-slate-500">{{ t('settings.security.commentApprovalDesc') }}</p>
                  </div>
                </div>
                <input type="checkbox" v-model="settings.require_comment_approval" class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" :style="{ color: settings.primary_color }" />
              </div>
            </div>
          </div>

          <!-- Appearance Settings -->
          <div v-if="activeTab === 'appearance'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="grid gap-6">
              <div class="space-y-4">
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.appearance.theme') }}</label>
                <div class="grid grid-cols-3 gap-4">
                  <button 
                    v-for="theme in ['light', 'dark', 'system']" 
                    :key="theme"
                    @click="settings.theme = theme"
                    :class="[
                      'p-4 rounded-2xl border text-sm font-bold transition-all capitalize',
                      settings.theme === theme ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                    ]"
                    :style="settings.theme === theme ? { color: settings.primary_color, borderColor: settings.primary_color, backgroundColor: `color-mix(in srgb, ${settings.primary_color} 10%, white)` } : {}"
                  >
                    {{ t(`settings.appearance.${theme}`) }}
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('settings.appearance.primaryColor') }}</label>
                <div class="flex items-center gap-4">
                  <input type="color" v-model="settings.primary_color" class="w-12 h-12 rounded-lg border-0 cursor-pointer" />
                  <span class="text-sm font-mono text-slate-500 uppercase">{{ settings.primary_color }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notification Settings -->
          <div v-if="activeTab === 'notifications'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm" :style="{ color: settings.primary_color }">
                    <Mail :size="20" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">{{ t('settings.notifications.email') }}</p>
                    <p class="text-xs text-slate-500">{{ t('settings.notifications.emailDesc') }}</p>
                  </div>
                </div>
                <input type="checkbox" v-model="settings.email_notifications" class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" :style="{ color: settings.primary_color }" />
              </div>

              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm" :style="{ color: settings.primary_color }">
                    <Smartphone :size="20" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">{{ t('settings.notifications.push') }}</p>
                    <p class="text-xs text-slate-500">{{ t('settings.notifications.pushDesc') }}</p>
                  </div>
                </div>
                <input type="checkbox" v-model="settings.push_notifications" class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" :style="{ color: settings.primary_color }" />
              </div>
            </div>
          </div>

          <!-- Placeholder for other tabs -->
          <div v-if="activeTab === 'advanced'" class="flex flex-col items-center justify-center py-12 text-center">
            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4" :style="{ color: settings.primary_color }">
              <Database :size="32" />
            </div>
            <h3 class="text-lg font-bold text-slate-900">{{ t('settings.advanced.title') }}</h3>
            <p class="text-sm text-slate-500 mt-1 max-w-xs">{{ t('settings.advanced.desc') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
