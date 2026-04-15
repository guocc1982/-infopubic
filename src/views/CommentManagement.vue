<script setup lang="ts">
import { ref, onMounted, inject, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Clock, 
  User,
  ExternalLink,
  AlertCircle
} from 'lucide-vue-next';
import { useApi } from '../composables/useApi';
import { useData } from '../composables/useData';

const { t } = useI18n();
const { apiFetch } = useApi();
const { articles } = useData();

// Inject system settings from App.vue
const systemSettings = inject('systemSettings', ref({ primary_color: '#4f46e5' }));

const comments = ref<any[]>([]);
const isLoading = ref(true);
const filter = ref<'all' | 'pending' | 'approved'>('pending');

const fetchAllComments = async () => {
  isLoading.value = true;
  try {
    // We need an endpoint to fetch all comments across all articles for management
    // For now, we'll fetch comments for each article or create a new endpoint
    // Let's assume we added a GET /api/comments endpoint in the backend
    const res = await apiFetch('/api/comments');
    if (res.ok) {
      comments.value = await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch comments:', error);
  } finally {
    isLoading.value = false;
  }
};

const approveComment = async (id: number) => {
  try {
    const res = await apiFetch(`/api/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: true })
    });
    if (res.ok) {
      const comment = comments.value.find(c => c.id === id);
      if (comment) comment.is_approved = 1;
    }
  } catch (error) {
    console.error('Failed to approve comment:', error);
  }
};

const rejectComment = async (id: number) => {
  try {
    const res = await apiFetch(`/api/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: false })
    });
    if (res.ok) {
      const comment = comments.value.find(c => c.id === id);
      if (comment) comment.is_approved = 0;
    }
  } catch (error) {
    console.error('Failed to reject comment:', error);
  }
};

const deleteComment = async (id: number) => {
  if (!confirm(t('common.deleteConfirm'))) return;
  try {
    const res = await apiFetch(`/api/comments/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      comments.value = comments.value.filter(c => c.id !== id);
    }
  } catch (error) {
    console.error('Failed to delete comment:', error);
  }
};

const getArticleTitle = (id: number) => {
  const article = articles.value.find(a => a.id === id);
  return article ? article.title : `Article #${id}`;
};

const filteredComments = computed(() => {
  if (filter.value === 'all') return comments.value;
  if (filter.value === 'pending') return comments.value.filter(c => !c.is_approved);
  return comments.value.filter(c => c.is_approved);
});

onMounted(fetchAllComments);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
        <button 
          v-for="f in ['pending', 'approved', 'all'] as const"
          :key="f"
          @click="filter = f"
          :class="[
            'px-6 py-2 rounded-lg text-sm font-bold transition-all capitalize',
            filter === f ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'
          ]"
          :style="filter === f ? { backgroundColor: systemSettings.primary_color } : {}"
        >
          {{ f === 'pending' ? t('common.pending') : f === 'approved' ? t('common.approved') : t('common.all') }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" :style="{ borderColor: systemSettings.primary_color, borderTopColor: 'transparent' }"></div>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <div v-for="comment in filteredComments" :key="comment.id" class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
        <div class="flex flex-col md:flex-row md:items-start gap-6">
          <div class="shrink-0">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
              {{ comment.author.charAt(0).toUpperCase() }}
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div class="flex items-center gap-3">
                <span class="font-bold text-slate-900">{{ comment.author }}</span>
                <span class="text-xs text-slate-400 flex items-center gap-1"><Clock :size="12" /> {{ new Date(comment.created_at).toLocaleString() }}</span>
                <span v-if="!comment.is_approved" class="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider border border-amber-200">
                  {{ t('common.pendingApproval') || 'Pending Approval' }}
                </span>
              </div>
              
              <div class="flex items-center gap-2">
                <button 
                  v-if="!comment.is_approved"
                  @click="approveComment(comment.id)"
                  class="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                  :title="t('common.approve')"
                >
                  <CheckCircle2 :size="18" />
                </button>
                <button 
                  v-if="comment.is_approved"
                  @click="rejectComment(comment.id)"
                  class="p-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all"
                  :title="t('common.reject')"
                >
                  <XCircle :size="18" />
                </button>
                <button 
                  @click="deleteComment(comment.id)"
                  class="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                  :title="t('common.delete')"
                >
                  <Trash2 :size="18" />
                </button>
              </div>
            </div>
            
            <p class="text-slate-600 leading-relaxed mb-4">{{ comment.content }}</p>
            
            <div class="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-fit">
              <MessageSquare :size="14" />
              <span>{{ t('common.onArticle') || 'On article' }}:</span>
              <router-link :to="`/article/${comment.article_id}`" class="font-bold text-indigo-600 hover:underline flex items-center gap-1" :style="{ color: systemSettings.primary_color }">
                {{ getArticleTitle(comment.article_id) }}
                <ExternalLink :size="12" />
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredComments.length === 0" class="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm">
          <MessageSquare :size="32" />
        </div>
        <p class="text-slate-400 font-medium">{{ t('common.noCommentsFound') || 'No comments found' }}</p>
      </div>
    </div>
  </div>
</template>
