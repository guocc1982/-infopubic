<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { 
  ArrowLeft, 
  User, 
  Clock, 
  Eye, 
  BookOpen, 
  MessageSquare, 
  Send, 
  Link as LinkIcon 
} from 'lucide-vue-next';
import { useData } from '../composables/useData';
import type { Article, Comment } from '../types';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { getCategoryName, fetchData } = useData();

const viewingArticle = ref<Article | null>(null);
const comments = ref<Comment[]>([]);
const newComment = ref({ author: '', content: '' });
const isLoading = ref(true);

const fetchArticle = async (id: number) => {
  isLoading.value = true;
  try {
    const res = await fetch(`/api/articles/${id}`);
    if (res.ok) {
      viewingArticle.value = await res.json();
      // Increment view count
      fetch(`/api/articles/${id}/view`, { method: 'POST' });
      fetchComments(id);
    }
  } catch (error) {
    console.error('Failed to fetch article:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchComments = async (articleId: number) => {
  try {
    const res = await fetch(`/api/articles/${articleId}/comments`);
    if (res.ok) {
      comments.value = await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch comments:', error);
  }
};

const submitComment = async () => {
  if (!viewingArticle.value || !newComment.value.author || !newComment.value.content) return;
  
  try {
    const res = await fetch(`/api/articles/${viewingArticle.value.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment.value)
    });
    
    if (res.ok) {
      await fetchComments(viewingArticle.value.id);
      newComment.value = { author: '', content: '' };
    }
  } catch (error) {
    console.error('Failed to submit comment:', error);
  }
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    alert(t('common.linkCopied'));
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

onMounted(async () => {
  const id = parseInt(route.params.id as string);
  if (id) {
    await Promise.all([
      fetchArticle(id),
      fetchData()
    ]);
  }
});
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center py-20">
    <div class="flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-slate-500 font-medium">{{ t('common.loading') }}</p>
    </div>
  </div>

  <div v-else-if="viewingArticle" class="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
    <div class="aspect-[21/9] relative overflow-hidden">
      <img 
        :src="viewingArticle.thumbnail_url || `https://picsum.photos/seed/${viewingArticle.id}/1200/600`" 
        class="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
        <div class="space-y-2">
          <span class="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
            {{ viewingArticle.category_name || getCategoryName(viewingArticle.category_id) }}
          </span>
          <h2 class="text-3xl md:text-4xl font-bold text-white leading-tight">{{ viewingArticle.title || t('article.noTitle') }}</h2>
        </div>
      </div>
    </div>
    
    <div class="p-8 md:p-12">
      <div class="flex flex-wrap items-center gap-6 text-sm text-slate-400 mb-8 pb-8 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <User :size="16" />
          </div>
          <span class="font-medium text-slate-700">{{ viewingArticle.author || t('article.admin') }}</span>
        </div>
        <span class="flex items-center gap-1.5"><Clock :size="16" /> {{ viewingArticle.publish_date }}</span>
        <span class="flex items-center gap-1.5"><Eye :size="16" /> {{ viewingArticle.view_count }} {{ t('common.timesRead') }}</span>
        <span class="flex items-center gap-1.5"><BookOpen :size="16" /> {{ viewingArticle.reading_time }} {{ t('article.minutes') }} {{ t('common.readMore') }}</span>
      </div>
      
      <div v-if="viewingArticle.subtitle" class="text-xl font-medium text-slate-600 mb-8 italic border-l-4 border-indigo-500 pl-6">
        {{ viewingArticle.subtitle }}
      </div>
      
      <div class="prose prose-slate prose-indigo max-w-none prose-headings:font-bold prose-a:text-indigo-600" v-html="viewingArticle.content"></div>
      
      <!-- Comments Section -->
      <div class="mt-16 pt-12 border-t border-slate-100">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <MessageSquare :size="20" />
          </div>
          <h3 class="text-2xl font-bold">{{ t('common.comments') }} ({{ comments.length }})</h3>
        </div>

        <!-- Comment Form -->
        <div class="bg-slate-50 rounded-3xl p-6 md:p-8 mb-12">
          <h4 class="text-lg font-bold mb-4">{{ t('common.postComment') }}</h4>
          <div class="space-y-4">
            <div>
              <input 
                v-model="newComment.author"
                type="text" 
                :placeholder="t('common.yourName')" 
                class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <textarea 
                v-model="newComment.content"
                rows="4" 
                :placeholder="t('common.yourThoughts')" 
                class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
              ></textarea>
            </div>
            <div class="flex justify-end">
              <button 
                @click="submitComment"
                class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <Send :size="18" /> {{ t('common.submitComment') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Comments List -->
        <div class="space-y-8">
          <div v-for="comment in comments" :key="comment.id" class="flex gap-4">
            <div class="shrink-0">
              <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
                {{ comment.author.charAt(0).toUpperCase() }}
              </div>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-slate-900">{{ comment.author }}</span>
                <span class="text-xs text-slate-400">{{ new Date(comment.created_at).toLocaleString() }}</span>
              </div>
              <p class="text-slate-600 leading-relaxed">{{ comment.content }}</p>
            </div>
          </div>
          <div v-if="comments.length === 0" class="text-center py-12 text-slate-400">
            {{ t('common.noComments') }}
          </div>
        </div>
      </div>
      
      <div class="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
        <button 
          @click="router.push('/reading-list')"
          class="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowLeft :size="18" /> {{ t('common.backToList') }}
        </button>
        
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400 uppercase tracking-widest font-bold">{{ t('common.shareArticle') }}</span>
          <div class="flex gap-2">
            <button @click="copyLink" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <LinkIcon :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
