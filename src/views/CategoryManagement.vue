<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  FolderTree, 
  PlusCircle, 
  Trash2, 
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-vue-next';
import { useData } from '../composables/useData';
import type { Category } from '../types';
import CategoryTreeItem from '../components/CategoryTreeItem.vue';
import CategorySelect from '../components/CategorySelect.vue';

const { categories, fetchData, tenantId } = useData();
const { t } = useI18n();
const editingCategory = ref<Partial<Category> | null>(null);
const searchQuery = ref('');

const categoryTree = computed(() => {
  const map: Record<number, Category & { children: any[] }> = {};
  const roots: any[] = [];

  categories.value.forEach(cat => {
    map[cat.id!] = { ...cat, children: [] };
  });

  categories.value.forEach(cat => {
    if (cat.parent_id && map[cat.parent_id]) {
      map[cat.parent_id].children.push(map[cat.id!]);
    } else {
      roots.push(map[cat.id!]);
    }
  });

  return roots;
});

const saveCategory = async (category: Partial<Category>) => {
  const method = category.id ? 'PUT' : 'POST';
  const url = category.id ? `/api/categories/${category.id}` : '/api/categories';
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId.value
      },
      body: JSON.stringify(category),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      await fetchData();
      editingCategory.value = null;
    }
  } catch (error) {
    console.error('Failed to save category:', error);
  } finally {
    clearTimeout(timeoutId);
  }
};

const deleteCategory = async (id: number) => {
  if (!confirm(t('common.deleteCategoryConfirm'))) return;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`/api/categories/${id}`, { 
      method: 'DELETE',
      headers: { 'X-Tenant-ID': tenantId.value },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) await fetchData();
  } catch (error) {
    console.error('Failed to delete category:', error);
  } finally {
    clearTimeout(timeoutId);
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1 space-y-6">
      <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">{{ t('common.categories') }}</h3>
          <button @click="editingCategory = { name: '', parent_id: null, description: '', display_order: 0, is_published: true, icon: '' }" class="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
            <PlusCircle :size="18" />
          </button>
        </div>

        <!-- Search Bar -->
        <div class="relative mb-6">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" :size="16" />
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('common.searchCategories') + '...'"
            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div class="space-y-1">
            <CategoryTreeItem 
              v-for="cat in categoryTree" 
              :key="cat.id"
              :item="cat"
              :selected-id="editingCategory?.id"
              :search-query="searchQuery"
              :depth="0"
              @select="editingCategory = $event"
              @delete="deleteCategory"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="lg:col-span-2">
      <div v-if="editingCategory" class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 class="font-bold text-xl mb-8">{{ editingCategory.id ? t('common.editCategory') : t('common.addCategory') }}</h3>
        <form @submit.prevent="saveCategory(editingCategory!)" class="space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">{{ t('article.category') }}</label>
              <input 
                v-model="editingCategory.name"
                type="text" 
                class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">{{ t('common.parentCategory') }}</label>
              <CategorySelect 
                v-model="editingCategory.parent_id!"
                :categories="categories.filter(c => c.id !== editingCategory?.id)"
                :placeholder="t('common.none')"
              />
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700">{{ t('common.description') }}</label>
            <textarea 
              v-model="editingCategory.description"
              rows="3"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            ></textarea>
          </div>
          <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                <CheckCircle2 :size="20" />
              </div>
              <div>
                <p class="text-sm font-bold">{{ t('common.publicDisplay') }}</p>
                <p class="text-xs text-slate-400">{{ t('common.publicDisplayDesc') }}</p>
              </div>
            </div>
            <input 
              type="checkbox" 
              v-model="editingCategory.is_published"
              class="w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          <div class="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              @click="editingCategory = null"
              class="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-all"
            >
              {{ t('common.cancel') }}
            </button>
            <button 
              type="submit"
              class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              {{ t('article.save') }}
            </button>
          </div>
        </form>
      </div>
      <div v-else class="h-full flex flex-col items-center justify-center p-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
        <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-sm">
          <FolderTree :size="32" />
        </div>
        <h3 class="text-lg font-bold text-slate-900">{{ t('common.selectCategoryToEdit') }}</h3>
        <p class="text-slate-500 text-sm">{{ t('common.createCategoryDesc') }}</p>
      </div>
    </div>
  </div>
</template>
