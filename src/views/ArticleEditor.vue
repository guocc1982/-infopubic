<script setup lang="ts">
import { ref, onMounted, computed, watch, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { 
  ArrowLeft, 
  Eye, 
  Save, 
  ChevronDown, 
  CheckCircle2, 
  Image as ImageIcon, 
  X, 
  Users, 
  Shield 
} from 'lucide-vue-next';
import Editor from '@tinymce/tinymce-vue';
import SelectionModal from '../components/SelectionModal.vue';
import ImageSelectorModal from '../components/ImageSelectorModal.vue';
import CategorySelect from '../components/CategorySelect.vue';
import { useData } from '../composables/useData';
import { useApi } from '../composables/useApi';
import { useAuth } from '../composables/useAuth';
import type { Article } from '../types';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { categories, fetchData, tenantId } = useData();
const { apiFetch } = useApi();
const { user } = useAuth();

// Inject system settings from App.vue
const systemSettings = inject('systemSettings', ref({ primary_color: '#4f46e5' }));

const editingArticle = ref<Partial<Article>>({
  title: '',
  subtitle: '',
  category_id: null,
  summary: '',
  content: '',
  status: 'draft',
  publish_date: new Date().toISOString().split('T')[0],
  view_count: 0,
  reading_time: 5,
  author: user.value?.display_name || user.value?.username || '管理员',
  allow_anonymous: true,
  allow_all_registered: false,
  allowed_roles: '',
  allowed_users: '',
  is_pinned: 0
});

const isPreviewMode = ref(false);
const isRoleModalOpen = ref(false);
const isUserModalOpen = ref(false);
const isImageSelectorOpen = ref(false);

const roles = ref<any[]>([]);
const users = ref<any[]>([]);

const roleOptions = computed(() => roles.value.map(r => r.name));
const userOptions = computed(() => users.value.map(u => u.display_name || u.username));

const tinymceInit = {
  base_url: '/tinymce',
  suffix: '.min',
  height: 600,
  menubar: false,
  plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table code help wordcount',
  toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image media | removeformat | help',
  content_style: 'body { font-family:Inter,Helvetica,Arial,sans-serif; font-size:16px }',
  branding: false,
  promotion: false,
  skin: 'oxide',
  content_css: 'default',
  image_title: true,
  automatic_uploads: true,
  file_picker_types: 'image media',
  media_live_embeds: true,
  images_upload_handler: (blobInfo: any) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject('图片上传失败');
    reader.readAsDataURL(blobInfo.blob());
  }),
  file_picker_callback: (callback: any, value: any, meta: any) => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    if (meta.filetype === 'image') {
      input.setAttribute('accept', 'image/*');
    } else if (meta.filetype === 'media') {
      input.setAttribute('accept', 'video/*');
    }
    input.onchange = function (e: any) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        callback(reader.result, { title: file.name });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
};

const wordCount = computed(() => {
  if (!editingArticle.value?.content) return 0;
  const text = editingArticle.value.content.replace(/<[^>]*>/g, '');
  return text.trim().length;
});

const statusToText = (status: string) => {
  switch (status) {
    case 'published': return t('article.published');
    case 'draft': return t('article.draft');
    case 'archived': return t('article.archived');
    case 'pending': return t('article.pending');
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'archived': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'pending': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const handleCoverImageConfirm = (url: string) => {
  editingArticle.value.thumbnail_url = url;
  isImageSelectorOpen.value = false;
};

const removeCoverImage = () => {
  editingArticle.value.thumbnail_url = '';
};

const handleRoleConfirm = (selected: string[]) => {
  editingArticle.value.allowed_roles = selected.join(',');
  isRoleModalOpen.value = false;
};

const handleUserConfirm = (selected: string[]) => {
  editingArticle.value.allowed_users = selected.join(',');
  isUserModalOpen.value = false;
};

const saveArticle = async (statusOverride?: Article['status']) => {
  const article = { ...editingArticle.value };
  if (statusOverride) article.status = statusOverride;

  const method = article.id ? 'PUT' : 'POST';
  const url = article.id ? `/api/articles/${article.id}` : '/api/articles';
  
  try {
    const res = await apiFetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(article)
    });
    if (res.ok) {
      router.push('/content-management');
    }
  } catch (error) {
    console.error('Failed to save article:', error);
  }
};

const loadArticle = async (id: number) => {
  try {
    const res = await apiFetch(`/api/articles/${id}`);
    if (res.ok) {
      const art = await res.json();
      editingArticle.value = {
        ...art,
        allow_anonymous: !!art.allow_anonymous,
        allow_all_registered: !!art.allow_all_registered
      };
    }
  } catch (error) {
    console.error('Failed to load article:', error);
  }
};

onMounted(async () => {
  await fetchData();
  
  // Fetch roles and users from DB
  try {
    const [rolesRes, usersRes] = await Promise.all([
      apiFetch('/api/roles'),
      apiFetch('/api/users')
    ]);
    if (rolesRes.ok) roles.value = await rolesRes.json();
    if (usersRes.ok) users.value = await usersRes.json();
  } catch (error) {
    console.error('Failed to fetch roles or users:', error);
  }

  if (route.params.id) {
    loadArticle(parseInt(route.params.id as string));
  } else {
    editingArticle.value.category_id = categories.value[0]?.id || null;
  }
});
</script>

<template>
  <div class="h-full flex flex-col -m-8">
    <!-- Editor Header -->
    <div class="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-4">
        <button @click="router.push('/content-management')" class="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
          <ArrowLeft :size="20" />
        </button>
        <div class="h-6 w-[1px] bg-slate-200"></div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-slate-900">
            {{ isPreviewMode ? (editingArticle.title || t('article.noTitle')) : (editingArticle.id ? t('common.edit') : t('common.publish')) }}
          </span>
          <span v-if="editingArticle.status" :class="['px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider', getStatusColor(editingArticle.status)]">
            {{ statusToText(editingArticle.status) }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 mr-4">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">已自动保存</span>
        </div>
        <button 
          @click="isPreviewMode = !isPreviewMode"
          class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          :style="isPreviewMode ? { color: systemSettings.primary_color } : {}"
        >
          <Eye :size="18" />
          {{ isPreviewMode ? 'Exit Preview' : 'Preview' }}
        </button>
        <button 
          @click="saveArticle('draft')"
          class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
        >
          {{ t('common.save') }}
        </button>
        <div class="flex items-center">
          <button 
            @click="saveArticle('published')"
            class="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-l-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            :style="{ backgroundColor: systemSettings.primary_color }"
          >
            <Save :size="18" />
            {{ t('common.publish') }}
          </button>
          <button class="px-2 py-2 bg-indigo-600 text-white rounded-r-xl border-l border-indigo-500 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100" :style="{ backgroundColor: systemSettings.primary_color, borderLeftColor: `color-mix(in srgb, ${systemSettings.primary_color} 80%, black)` }">
            <ChevronDown :size="18" />
          </button>
        </div>
      </div>
    </div>

    <!-- Editor Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Main Editor -->
      <div class="flex-1 overflow-y-auto bg-white">
        <div v-if="!isPreviewMode" class="max-w-3xl mx-auto py-16 px-8 space-y-8">
          <div class="space-y-4">
            <textarea 
              v-model="editingArticle.title"
              :placeholder="t('article.title') + '...'"
              rows="1"
              class="w-full text-5xl font-black border-none focus:ring-0 placeholder:text-slate-200 p-0 resize-none leading-tight"
              @input="(e) => { (e.target as HTMLTextAreaElement).style.height = 'auto'; (e.target as HTMLTextAreaElement).style.height = (e.target as HTMLTextAreaElement).scrollHeight + 'px' }"
            ></textarea>
            <input 
              v-model="editingArticle.subtitle"
              type="text" 
              :placeholder="t('article.subtitle') + '...'"
              class="w-full text-xl font-medium text-slate-400 border-none focus:ring-0 placeholder:text-slate-100 p-0"
            />
          </div>

          <div class="h-[1px] bg-slate-100"></div>

          <Editor
            v-model="editingArticle.content"
            tinymce-script-src="/tinymce/tinymce.min.js"
            :init="tinymceInit"
          />

          <div class="flex items-center justify-between pt-8 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div class="flex items-center gap-4">
              <span>{{ t('article.wordCount') }}: {{ wordCount }}</span>
              <span>{{ t('article.estReadingTime') }}: {{ Math.ceil(wordCount / 500) }} {{ t('article.minutes') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle2 :size="12" class="text-emerald-500" />
              <span>Auto-saved</span>
            </div>
          </div>
        </div>

        <!-- Preview Mode -->
        <div v-else class="max-w-3xl mx-auto py-16 px-8">
          <div class="aspect-video w-full rounded-3xl overflow-hidden mb-12 shadow-2xl shadow-slate-200 bg-slate-100">
            <img v-if="editingArticle.thumbnail_url" :src="editingArticle.thumbnail_url" class="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
              <ImageIcon :size="48" />
            </div>
          </div>
          <h1 class="text-5xl font-black leading-tight mb-4">{{ editingArticle.title || t('article.noTitle') }}</h1>
          <p class="text-xl text-slate-400 mb-8">{{ editingArticle.subtitle }}</p>
          <div class="flex items-center gap-4 mb-12 pb-12 border-b border-slate-100">
            <div class="w-12 h-12 rounded-full bg-slate-100 overflow-hidden">
              <img src="https://picsum.photos/seed/author/100/100" class="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <p class="font-bold text-slate-900">{{ editingArticle.author || 'Admin' }}</p>
              <p class="text-xs text-slate-400">{{ editingArticle.publish_date }} · {{ editingArticle.reading_time }} min read</p>
            </div>
          </div>
          <div class="prose prose-slate prose-lg max-w-none font-serif leading-relaxed text-slate-700" v-html="editingArticle.content || t('article.noContent')">
          </div>
        </div>
      </div>

      <!-- Sidebar Settings -->
      <div class="w-80 border-l border-slate-200 bg-slate-50/50 overflow-y-auto p-6 space-y-8">
        <div class="space-y-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t('article.settings') }}</h3>
          
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700">{{ t('article.category') }}</label>
            <CategorySelect 
              v-model="editingArticle.category_id!"
              :categories="categories"
              :placeholder="t('article.selectCategory')"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700">{{ t('article.publishDate') }}</label>
            <input 
              v-model="editingArticle.publish_date"
              type="date"
              class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700">{{ t('article.readingTime') }} ({{ t('article.minutes') }})</label>
            <input 
              v-model="editingArticle.reading_time"
              type="number"
              class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700">{{ t('article.author') }}</label>
            <input 
              v-model="editingArticle.author"
              type="text"
              class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
            />
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t('article.coverImage') }} & {{ t('article.summary') }}</h3>
          
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700">{{ t('article.coverImage') }}</label>
            <div 
              class="aspect-video bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all shadow-sm overflow-hidden relative"
              @click="isImageSelectorOpen = true"
            >
              <template v-if="editingArticle.thumbnail_url">
                <img :src="editingArticle.thumbnail_url" class="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                  <button 
                    @click.stop="isImageSelectorOpen = true"
                    class="p-2 bg-white rounded-full text-slate-700 hover:text-indigo-600 shadow-lg"
                  >
                    <ImageIcon :size="16" />
                  </button>
                  <button 
                    @click.stop="removeCoverImage"
                    class="p-2 bg-white rounded-full text-slate-700 hover:text-red-600 shadow-lg"
                  >
                    <X :size="16" />
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="relative z-10 flex flex-col items-center">
                  <div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-400 shadow-sm mb-2 transition-colors">
                    <ImageIcon :size="20" />
                  </div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Click to select cover</p>
                </div>
              </template>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700">{{ t('article.summary') }}</label>
            <textarea 
              v-model="editingArticle.summary"
              rows="4"
              :placeholder="t('article.summary') + '...'"
              class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all resize-none"
            ></textarea>
          </div>
        </div>

        <div class="pt-6 border-t border-slate-200 space-y-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t('article.authSettings') }}</h3>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Eye :size="16" />
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-700">{{ t('article.allowAnonymous') }}</p>
                  <p class="text-[10px] text-slate-400">Public access</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                v-model="editingArticle.allow_anonymous"
                class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div v-if="!editingArticle.allow_anonymous" class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Shield :size="16" />
                  </div>
                  <div>
                    <p class="text-xs font-bold text-slate-700">{{ t('article.onlyRegistered') }}</p>
                    <p class="text-[10px] text-slate-400">Logged in users only</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  v-model="editingArticle.allow_all_registered"
                  class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  :style="{ color: systemSettings.primary_color }"
                />
              </div>

              <div v-if="!editingArticle.allow_all_registered" class="space-y-4">
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Users :size="14" class="text-slate-400" />
                      {{ t('article.specifiedRoles') }}
                    </label>
                    <button @click="isRoleModalOpen = true" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider" :style="{ color: systemSettings.primary_color }">{{ t('article.selectRoles') }}</button>
                  </div>
                  <div class="flex flex-wrap gap-1.5 p-3 bg-white border border-slate-200 rounded-xl min-h-[44px]">
                    <span v-for="role in editingArticle.allowed_roles?.split(',').filter(r => r)" :key="role" class="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100" :style="{ color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)`, borderColor: `color-mix(in srgb, ${systemSettings.primary_color} 20%, white)` }">
                      {{ role }}
                    </span>
                    <span v-if="!editingArticle.allowed_roles" class="text-[10px] text-slate-300 italic">None</span>
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Users :size="14" class="text-slate-400" />
                      {{ t('article.specifiedUsers') }}
                    </label>
                    <button @click="isUserModalOpen = true" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider" :style="{ color: systemSettings.primary_color }">{{ t('article.selectUsers') }}</button>
                  </div>
                  <div class="flex flex-wrap gap-1.5 p-3 bg-white border border-slate-200 rounded-xl min-h-[44px]">
                    <span v-for="user in editingArticle.allowed_users?.split(',').filter(u => u)" :key="user" class="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100">
                      {{ user }}
                    </span>
                    <span v-if="!editingArticle.allowed_users" class="text-[10px] text-slate-300 italic">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <SelectionModal 
      :is-open="isRoleModalOpen"
      :title="t('article.selectRoles')"
      :items="roleOptions"
      :selected-items="editingArticle.allowed_roles?.split(',').filter(r => r) || []"
      @close="isRoleModalOpen = false"
      @confirm="handleRoleConfirm"
    />

    <SelectionModal 
      :is-open="isUserModalOpen"
      :title="t('article.selectUsers')"
      :items="userOptions"
      :selected-items="editingArticle.allowed_users?.split(',').filter(u => u) || []"
      @close="isUserModalOpen = false"
      @confirm="handleUserConfirm"
    />

    <ImageSelectorModal 
      :is-open="isImageSelectorOpen"
      :current-image-url="editingArticle.thumbnail_url"
      @close="isImageSelectorOpen = false"
      @confirm="handleCoverImageConfirm"
    />
  </div>
</template>
