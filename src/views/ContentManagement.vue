<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { 
  Search, 
  Filter, 
  Download, 
  PlusCircle, 
  Trash2, 
  Edit2, 
  MoreVertical, 
  ExternalLink, 
  Copy, 
  Pin, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  X
} from 'lucide-vue-next';
import { useData } from '../composables/useData';
import type { Article } from '../types';

const router = useRouter();
const { t } = useI18n();
const { categories, articles, isLoading, fetchData, getCategoryName, searchQuery, tenantId } = useData();

const selectedCategoryId = ref<number | null>(null);
const selectedStatus = ref<'all' | 'published' | 'draft' | 'archived' | 'pending'>('all');
const selectedArticleIds = ref<number[]>([]);
const isAdvancedFilterOpen = ref(false);
const activeDropdownId = ref<number | null>(null);
const isBulkEditModalOpen = ref(false);

const bulkEditData = ref({
  category_id: null as number | null,
  status: '' as string,
  author: '' as string,
});

const advancedFilters = ref({
  author: '',
  startDate: '',
  endDate: '',
  minReadingTime: null as number | null,
  maxReadingTime: null as number | null,
  minViewCount: null as number | null,
  maxViewCount: null as number | null,
});

const resetFilters = () => {
  searchQuery.value = '';
  selectedCategoryId.value = null;
  selectedStatus.value = 'all';
  advancedFilters.value = {
    author: '',
    startDate: '',
    endDate: '',
    minReadingTime: null,
    maxReadingTime: null,
    minViewCount: null,
    maxViewCount: null,
  };
};

const filteredArticles = computed(() => {
  return articles.value.filter(art => {
    const title = art.title || '';
    const summary = art.summary || '';
    const searchQueryLower = searchQuery.value.toLowerCase();
    
    const matchesSearch = title.toLowerCase().includes(searchQueryLower) ||
                         summary.toLowerCase().includes(searchQueryLower);
    const matchesCategory = !selectedCategoryId.value || art.category_id === selectedCategoryId.value;
    const matchesStatus = selectedStatus.value === 'all' || art.status === selectedStatus.value;
    
    // Advanced filters
    const matchesAuthor = !advancedFilters.value.author || 
                         (art.author && art.author.toLowerCase().includes(advancedFilters.value.author.toLowerCase()));
    
    let matchesDate = true;
    if (advancedFilters.value.startDate) {
      matchesDate = matchesDate && art.publish_date >= advancedFilters.value.startDate;
    }
    if (advancedFilters.value.endDate) {
      matchesDate = matchesDate && art.publish_date <= advancedFilters.value.endDate;
    }

    const matchesReadingTime = (!advancedFilters.value.minReadingTime || art.reading_time >= advancedFilters.value.minReadingTime) &&
                               (!advancedFilters.value.maxReadingTime || art.reading_time <= advancedFilters.value.maxReadingTime);
    
    const matchesViewCount = (!advancedFilters.value.minViewCount || art.view_count >= advancedFilters.value.minViewCount) &&
                             (!advancedFilters.value.maxViewCount || art.view_count <= advancedFilters.value.maxViewCount);

    return matchesSearch && matchesCategory && matchesStatus && matchesAuthor && matchesDate && matchesReadingTime && matchesViewCount;
  });
});

const toggleSelectAll = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
    selectedArticleIds.value = filteredArticles.value.map(a => a.id!);
  } else {
    selectedArticleIds.value = [];
  }
};

const toggleSelectArticle = (id: number) => {
  const index = selectedArticleIds.value.indexOf(id);
  if (index > -1) {
    selectedArticleIds.value.splice(index, 1);
  } else {
    selectedArticleIds.value.push(id);
  }
};

const isAllSelected = computed(() => {
  return filteredArticles.value.length > 0 && selectedArticleIds.value.length === filteredArticles.value.length;
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

const deleteArticle = async (id: number) => {
  if (!confirm(t('common.deleteConfirm'))) return;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/articles/${id}`, { 
      method: 'DELETE',
      headers: { 'X-Tenant-ID': tenantId.value },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) await fetchData();
  } catch (error) {
    console.error('Failed to delete article:', error);
  } finally {
    clearTimeout(timeoutId);
  }
};

const bulkDelete = async () => {
  if (!confirm(t('common.bulkDeleteConfirm', { count: selectedArticleIds.value.length }))) return;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    await Promise.all(selectedArticleIds.value.map(id => 
      fetch(`/api/articles/${id}`, { 
        method: 'DELETE',
        headers: { 'X-Tenant-ID': tenantId.value },
        signal: controller.signal
      })
    ));
    clearTimeout(timeoutId);
    selectedArticleIds.value = [];
    await fetchData();
  } catch (error) {
    console.error('Failed to delete articles:', error);
  } finally {
    clearTimeout(timeoutId);
  }
};

const exportArticles = () => {
  const dataToExport = filteredArticles.value;
  if (dataToExport.length === 0) {
    alert(t('common.noExportData'));
    return;
  }

  const headers = ['ID', t('article.title'), t('article.category'), t('common.status'), t('article.author'), t('article.publishDate'), t('article.readingTime'), t('common.views')];
  const rows = dataToExport.map(art => {
    const category = getCategoryName(art.category_id);
    return [
      art.id,
      `"${art.title.replace(/"/g, '""')}"`,
      `"${category}"`,
      `"${statusToText(art.status)}"`,
      `"${art.author || ''}"`,
      art.publish_date || '',
      art.reading_time || 0,
      art.view_count || 0
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `文章导出_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const openBulkEdit = () => {
  bulkEditData.value = { category_id: null, status: '', author: '' };
  isBulkEditModalOpen.value = true;
};

const performBulkEdit = async () => {
  const updates: Record<string, any> = {};
  if (bulkEditData.value.category_id !== null) updates.category_id = bulkEditData.value.category_id;
  if (bulkEditData.value.status) updates.status = bulkEditData.value.status;
  if (bulkEditData.value.author) updates.author = bulkEditData.value.author;

  if (Object.keys(updates).length === 0) {
    isBulkEditModalOpen.value = false;
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    await Promise.all(selectedArticleIds.value.map(id => 
      fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId.value
        },
        body: JSON.stringify(updates),
        signal: controller.signal
      })
    ));
    clearTimeout(timeoutId);
    isBulkEditModalOpen.value = false;
    selectedArticleIds.value = [];
    await fetchData();
  } catch (error) {
    console.error('Failed to perform bulk edit:', error);
  } finally {
    clearTimeout(timeoutId);
  }
};

const toggleDropdown = (id: number) => {
  activeDropdownId.value = activeDropdownId.value === id ? null : id;
};

const handleMoreAction = async (action: string, article: Article) => {
  activeDropdownId.value = null;
  switch (action) {
    case 'preview':
      router.push(`/article/${article.id}`);
      break;
    case 'copy-link':
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/article/${article.id}`);
        alert(t('common.linkCopied'));
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      break;
    case 'pin':
      try {
        await fetch(`/api/articles/${article.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId.value
          },
          body: JSON.stringify({ is_pinned: article.is_pinned ? 0 : 1 })
        });
        await fetchData();
      } catch (error) {
        console.error('Failed to pin article:', error);
      }
      break;
    case 'status-published':
    case 'status-draft':
    case 'status-archived':
      const newStatus = action.split('-')[1] as Article['status'];
      await saveArticleStatus(article.id!, newStatus);
      break;
  }
};

const saveArticleStatus = async (id: number, status: Article['status']) => {
  try {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId.value
      },
      body: JSON.stringify({ status })
    });
    if (res.ok) await fetchData();
  } catch (error) {
    console.error('Failed to update status:', error);
  }
};

onMounted(() => {
  fetchData(true);
  window.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.more-actions-container')) {
      activeDropdownId.value = null;
    }
  });
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <button 
            v-for="status in ['all', 'published', 'draft', 'archived', 'pending'] as const"
            :key="status"
            @click="selectedStatus = status; selectedArticleIds = []"
            :class="[
              'px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all capitalize whitespace-nowrap',
              selectedStatus === status ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'
            ]"
          >
            {{ status === 'all' ? t('common.all') : status === 'published' ? t('article.published') : status === 'draft' ? t('article.draft') : status === 'archived' ? t('article.archived') : t('article.pending') }}
          </button>
        </div>

        <!-- Bulk Actions -->
        <transition enter-active-class="transition duration-200 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
          <div v-if="selectedArticleIds.length > 0" class="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-xl">
            <span class="text-xs font-bold text-indigo-600">{{ t('common.selected') }} {{ selectedArticleIds.length }} {{ t('common.items') }}</span>
            <div class="w-[1px] h-4 bg-indigo-200 mx-1"></div>
            <button @click="bulkDelete" class="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1">
              <Trash2 :size="14" /> {{ t('common.bulkDelete') }}
            </button>
            <button @click="openBulkEdit" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
              <Edit2 :size="14" /> {{ t('common.bulkEdit') }}
            </button>
          </div>
        </transition>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
          @click="isAdvancedFilterOpen = !isAdvancedFilterOpen"
          :class="[
            'flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium shadow-sm transition-all cursor-pointer',
            isAdvancedFilterOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
          ]"
        >
          <Filter :size="16" />
          {{ t('common.advancedFilter') }}
        </button>
        <button 
          @click="exportArticles"
          class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 shadow-sm hover:border-indigo-300 transition-all"
        >
          <Download :size="16" />
          {{ t('common.export') }}
        </button>
      </div>
    </div>

    <transition 
      enter-active-class="transition duration-300 ease-out" 
      enter-from-class="transform -translate-y-4 opacity-0" 
      enter-to-class="transform translate-y-0 opacity-100" 
      leave-active-class="transition duration-200 ease-in" 
      leave-from-class="transform translate-y-0 opacity-100" 
      leave-to-class="transform -translate-y-4 opacity-0"
    >
      <div v-if="isAdvancedFilterOpen" class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('article.category') }}</label>
            <select 
              v-model="selectedCategoryId"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option :value="null">{{ t('article.allCategories') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('article.author') }}</label>
            <input 
              v-model="advancedFilters.author"
              type="text" 
              :placeholder="t('common.search') + ' ' + t('article.author') + '...'"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('article.publishDate') }}</label>
            <div class="flex items-center gap-2">
              <input 
                v-model="advancedFilters.startDate"
                type="date" 
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <span class="text-slate-400">-</span>
              <input 
                v-model="advancedFilters.endDate"
                type="date" 
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('article.readingTime') }} ({{ t('article.minutes') }})</label>
            <div class="flex items-center gap-2">
              <input 
                v-model.number="advancedFilters.minReadingTime"
                type="number" 
                placeholder="Min"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <span class="text-slate-400">-</span>
              <input 
                v-model.number="advancedFilters.maxReadingTime"
                type="number" 
                placeholder="Max"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('common.views') }}</label>
            <div class="flex items-center gap-2">
              <input 
                v-model.number="advancedFilters.minViewCount"
                type="number" 
                placeholder="Min"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <span class="text-slate-400">-</span>
              <input 
                v-model.number="advancedFilters.maxViewCount"
                type="number" 
                placeholder="Max"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-2 border-t border-slate-50">
          <button 
            @click="resetFilters"
            class="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            {{ t('common.reset') }}
          </button>
          <button 
            @click="isAdvancedFilterOpen = false"
            class="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            {{ t('common.done') }}
          </button>
        </div>
      </div>
    </transition>

    <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-[0.1em] border-b border-slate-100">
              <th class="px-8 py-5 w-12">
                <input 
                  type="checkbox" 
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                />
              </th>
              <th class="px-6 py-5">{{ t('common.articleDetails') }}</th>
              <th class="px-6 py-5">{{ t('article.category') }}</th>
              <th class="px-6 py-5">{{ t('common.status') }}</th>
              <th class="px-6 py-5">{{ t('article.publishDate') }}</th>
              <th class="px-6 py-5">{{ t('common.interactions') }}</th>
              <th class="px-8 py-5 text-right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr 
              v-for="article in filteredArticles" 
              :key="article.id" 
              :class="[
                'transition-colors group',
                selectedArticleIds.includes(article.id!) ? 'bg-indigo-50/30' : 'hover:bg-slate-50/30'
              ]"
            >
              <td class="px-8 py-5">
                <input 
                  type="checkbox" 
                  :checked="selectedArticleIds.includes(article.id!)"
                  @change="toggleSelectArticle(article.id!)"
                  class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                />
              </td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 rounded-2xl bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                    <img :src="article.thumbnail_url || `https://picsum.photos/seed/${article.id}/100/100`" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{{ article.title }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{{ article.author || t('article.admin') }}</span>
                      <span class="text-[10px] text-slate-300">|</span>
                      <span class="text-[10px] text-slate-400">{{ article.reading_time }} {{ t('article.minutes') }} read</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-indigo-400"></div>
                  <span class="text-sm font-medium text-slate-600">{{ getCategoryName(article.category_id) }}</span>
                </div>
              </td>
              <td class="px-6 py-5">
                <span :class="['px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider', getStatusColor(article.status)]">
                  {{ statusToText(article.status) }}
                </span>
              </td>
              <td class="px-6 py-5">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-slate-700">{{ article.publish_date }}</span>
                  <span class="text-[10px] text-slate-400">{{ t('common.lastUpdated') }}</span>
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-4">
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-900">{{ article.view_count }}</span>
                    <span class="text-[10px] text-slate-400 flex items-center gap-1"><Eye :size="10" /> {{ t('common.views') }}</span>
                  </div>
                </div>
              </td>
              <td class="px-8 py-5 text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  <button @click="router.push(`/article/edit/${article.id}`)" class="p-2.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all" :title="t('common.edit')">
                    <Edit2 :size="16" />
                  </button>
                  <button @click="deleteArticle(article.id!)" class="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all" :title="t('common.delete')">
                    <Trash2 :size="16" />
                  </button>
                  <div class="relative more-actions-container">
                    <button 
                      @click.stop="toggleDropdown(article.id!)"
                      class="p-2.5 hover:bg-slate-100 text-slate-400 rounded-xl transition-all"
                    >
                      <MoreVertical :size="16" />
                    </button>
                    
                    <!-- Dropdown Menu -->
                    <div 
                      v-if="activeDropdownId === article.id"
                      class="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <button @click="handleMoreAction('preview', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        <ExternalLink :size="14" /> {{ t('common.preview') }}
                      </button>
                      <button @click="handleMoreAction('copy-link', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        <Copy :size="14" /> {{ t('common.copyLink') }}
                      </button>
                      <button @click="handleMoreAction('pin', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        <Pin :size="14" /> {{ t('common.pin') }}
                      </button>
                      <div class="my-1 border-t border-slate-50"></div>
                      <div class="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ t('common.changeStatus') }}</div>
                      <button @click="handleMoreAction('status-published', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                        <CheckCircle2 :size="14" /> {{ t('common.publish') }}
                      </button>
                      <button @click="handleMoreAction('status-draft', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                        <Clock :size="14" /> {{ t('article.draft') }}
                      </button>
                      <button @click="handleMoreAction('status-archived', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                        <AlertCircle :size="14" /> {{ t('article.archived') }}
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
        <p class="text-xs font-medium text-slate-400">显示 {{ filteredArticles.length }} 条结果中的第 1-{{ filteredArticles.length }} 条</p>
        <div class="flex items-center gap-2">
          <button class="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-white transition-all disabled:opacity-50" disabled>
            <ChevronLeft :size="16" />
          </button>
          <button class="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-white transition-all disabled:opacity-50" disabled>
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Edit Modal -->
    <div v-if="isBulkEditModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="isBulkEditModalOpen = false"></div>
      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 class="text-lg font-bold">{{ t('common.bulkEdit') }} ({{ selectedArticleIds.length }} {{ t('common.items') }})</h3>
          <button @click="isBulkEditModalOpen = false" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X :size="20" />
          </button>
        </div>
        <div class="p-6 space-y-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('article.category') }}</label>
            <select v-model="bulkEditData.category_id" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none">
              <option :value="null">{{ t('common.keepSame') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('common.status') }}</label>
            <select v-model="bulkEditData.status" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none">
              <option value="">{{ t('common.keepSame') }}</option>
              <option value="published">{{ t('article.published') }}</option>
              <option value="draft">{{ t('article.draft') }}</option>
              <option value="archived">{{ t('article.archived') }}</option>
              <option value="pending">{{ t('article.pending') }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">{{ t('article.author') }}</label>
            <input v-model="bulkEditData.author" type="text" :placeholder="t('common.enterAuthor')" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
          </div>
        </div>
        <div class="p-6 bg-slate-50 flex justify-end gap-3">
          <button @click="isBulkEditModalOpen = false" class="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">{{ t('common.cancel') }}</button>
          <button @click="performBulkEdit" class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
