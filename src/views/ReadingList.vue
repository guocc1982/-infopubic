<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { 
  BookOpen, 
  Search, 
  Clock, 
  Eye, 
  ChevronRight 
} from 'lucide-vue-next';
import { useData } from '../composables/useData';

const router = useRouter();
const { t } = useI18n();
const { categories, articles, isLoading, fetchData, getCategoryName, searchQuery } = useData();

// Inject system settings from App.vue
const systemSettings = inject('systemSettings', ref({ primary_color: '#4f46e5' }));

const selectedCategoryId = ref<number | null>(null);

const filteredArticles = computed(() => {
  return articles.value.filter(art => {
    const title = art.title || '';
    const summary = art.summary || '';
    const searchQueryLower = searchQuery.value.toLowerCase();
    
    const matchesSearch = title.toLowerCase().includes(searchQueryLower) ||
                         summary.toLowerCase().includes(searchQueryLower);
    
    let matchesCategory = true;
    if (selectedCategoryId.value) {
      matchesCategory = art.category_id === selectedCategoryId.value;
    }
    
    // Reading list only shows published articles
    return matchesSearch && matchesCategory && art.status === 'published';
  });
});

const navigateToDetail = (id: number) => {
  router.push(`/article/${id}`);
};

onMounted(() => fetchData(true));
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex flex-wrap gap-2">
        <button 
          @click="selectedCategoryId = null"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium transition-all',
            !selectedCategoryId ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          ]"
          :style="!selectedCategoryId ? { backgroundColor: systemSettings.primary_color } : {}"
        >
          {{ t('common.all') }}
        </button>
        <button 
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategoryId = cat.id!"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium transition-all',
            selectedCategoryId === cat.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          ]"
          :style="selectedCategoryId === cat.id ? { backgroundColor: systemSettings.primary_color } : {}"
        >
          {{ cat.name }}
        </button>
      </div>
      
      <div class="relative w-full md:w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" :size="18" />
        <input 
          v-model="searchQuery"
          type="text" 
          :placeholder="t('common.search') + '...'"
          class="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" :style="{ borderColor: systemSettings.primary_color, borderTopColor: 'transparent' }"></div>
        <p class="text-slate-500 font-medium">{{ t('common.loading') }}</p>
      </div>
    </div>

    <div v-else-if="filteredArticles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="article in filteredArticles" 
        :key="article.id"
        class="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col"
      >
        <div class="aspect-video relative overflow-hidden">
          <img 
            :src="article.thumbnail_url || `https://picsum.photos/seed/${article.id}/600/400`" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div class="absolute top-4 left-4">
            <span class="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider" :style="{ color: systemSettings.primary_color }">
              {{ article.category_name || getCategoryName(article.category_id) }}
            </span>
          </div>
        </div>
        <div class="p-6 flex-1 flex flex-col">
          <div class="flex items-center gap-4 text-xs text-slate-400 mb-3">
            <span class="flex items-center gap-1"><Clock :size="14" /> {{ article.publish_date }}</span>
            <span class="flex items-center gap-1"><Eye :size="14" /> {{ article.view_count }}</span>
          </div>
          <h3 class="text-xl font-bold mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2" :style="`--hover-color: ${systemSettings.primary_color}`">{{ article.title }}</h3>
          <p class="text-slate-500 text-sm mb-6 line-clamp-3 leading-relaxed">{{ article.summary }}</p>
          <div class="mt-auto flex items-center justify-between">
            <span class="text-xs font-medium text-slate-400">{{ article.reading_time }} {{ t('article.minutes') }} read</span>
            <button 
              @click="navigateToDetail(article.id!)"
              class="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
              :style="{ color: systemSettings.primary_color }"
            >
              {{ t('common.readMore') }} <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
        <Search :size="40" />
      </div>
      <h3 class="text-lg font-semibold text-slate-900">{{ t('common.noResults') }}</h3>
      <p class="text-slate-500">{{ t('common.tryAgain') }}</p>
    </div>
  </div>
</template>
