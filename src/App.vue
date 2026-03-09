<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  LayoutDashboard, 
  BookOpen, 
  Settings, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  FolderTree,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Save,
  X,
  ArrowLeft,
  Download,
  Upload,
  Shield,
  Users,
  User,
  MessageSquare,
  Send,
  Pin,
  Copy,
  ExternalLink,
  ArrowUpCircle
} from 'lucide-vue-next';
import type { Category, Article, Comment } from './types';
import SelectionModal from './components/SelectionModal.vue';
import ImageSelectorModal from './components/ImageSelectorModal.vue';
import Editor from '@tinymce/tinymce-vue';

// State
const route = useRoute();
const router = useRouter();
const currentView = ref<'reading-list' | 'info-list' | 'category-mgmt' | 'article-editor' | 'article-detail'>('reading-list');
const isSidebarCollapsed = ref(false);
const categories = ref<Category[]>([]);
const articles = ref<Article[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const selectedCategoryId = ref<number | null>(null);
const selectedStatus = ref<'all' | 'published' | 'draft' | 'archived' | 'pending'>('all');
const editingArticle = ref<Partial<Article> | null>(null);
const viewingArticle = ref<Article | null>(null);
const activeDropdownId = ref<number | null>(null);
const comments = ref<Comment[]>([]);
const newComment = ref({ author: '', content: '' });
const editingCategory = ref<Partial<Category> | null>(null);
const isPreviewMode = ref(false);
const mockRoles = ['管理员', '编辑', '普通员工', '访客', '财务部', '人事部', '技术部', '市场部'];
const mockUsers = [
  '张三', '李四', '王五', '赵六', '钱七', 
  '孙八', '周九', '吴十', '郑十一', '王十二',
  '陈十三', '褚十四', '卫十五', '蒋十六', '沈十七',
  '韩十八', '杨十九', '朱二十', '秦二十一', '尤二十二'
];
const selectedArticleIds = ref<number[]>([]);
const isRoleModalOpen = ref(false);
const isUserModalOpen = ref(false);
const isImageSelectorOpen = ref(false);
const isAdvancedFilterOpen = ref(false);
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

const handleCoverImageConfirm = (url: string) => {
  if (editingArticle.value) {
    editingArticle.value.thumbnail_url = url;
  }
  isImageSelectorOpen.value = false;
};

const removeCoverImage = () => {
  if (editingArticle.value) {
    editingArticle.value.thumbnail_url = '';
  }
};

const handleRoleConfirm = (selected: string[]) => {
  if (editingArticle.value) {
    editingArticle.value.allowed_roles = selected.join(',');
  }
  isRoleModalOpen.value = false;
};

const handleUserConfirm = (selected: string[]) => {
  if (editingArticle.value) {
    editingArticle.value.allowed_users = selected.join(',');
  }
  isUserModalOpen.value = false;
};

const statusToText = (status: string) => {
  switch (status) {
    case 'published': return '已发布';
    case 'draft': return '草稿';
    case 'archived': return '已归档';
    case 'pending': return '待审核';
    default: return status;
  }
};

const wordCount = computed(() => {
  if (!editingArticle.value?.content) return 0;
  // Strip HTML tags for a more accurate character count
  const text = editingArticle.value.content.replace(/<[^>]*>/g, '');
  return text.trim().length;
});

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

const bulkDelete = async () => {
  if (!confirm(`确定要删除选中的 ${selectedArticleIds.value.length} 篇文章吗？`)) return;
  try {
    await Promise.all(selectedArticleIds.value.map(id => fetch(`/api/articles/${id}`, { method: 'DELETE' })));
    selectedArticleIds.value = [];
    await fetchData();
  } catch (error) {
    console.error('Failed to delete articles:', error);
  }
};

const exportArticles = () => {
  const dataToExport = filteredArticles.value;
  if (dataToExport.length === 0) {
    alert('没有可导出的数据');
    return;
  }

  // Define CSV headers
  const headers = ['ID', '标题', '分类', '状态', '作者', '发布日期', '阅读时长(分)', '浏览量'];
  
  // Map data to rows
  const rows = dataToExport.map(art => {
    const category = categories.value.find(c => c.id === art.category_id)?.name || '未分类';
    return [
      art.id,
      `"${art.title.replace(/"/g, '""')}"`, // Escape quotes
      `"${category}"`,
      `"${statusToText(art.status)}"`,
      `"${art.author || ''}"`,
      art.publish_date || '',
      art.reading_time || 0,
      art.view_count || 0
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
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

// Fetch Data
const fetchData = async () => {
  isLoading.value = true;
  try {
    const [catsRes, artsRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/articles')
    ]);
    categories.value = await catsRes.json();
    articles.value = (await artsRes.json()).map((art: any) => ({
      ...art,
      allow_anonymous: !!art.allow_anonymous,
      allow_all_registered: !!art.allow_all_registered
    }));
  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

// Computed
const filteredArticles = computed(() => {
  return articles.value.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         art.summary.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesCategory = !selectedCategoryId.value || art.category_id === selectedCategoryId.value;
    
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

    // Reading list only shows published articles
    if (currentView.value === 'reading-list') {
      return matchesSearch && matchesCategory && art.status === 'published' && matchesAuthor && matchesDate && matchesReadingTime && matchesViewCount;
    }
    
    const matchesStatus = selectedStatus.value === 'all' || art.status === selectedStatus.value;
    return matchesSearch && matchesCategory && matchesStatus && matchesAuthor && matchesDate && matchesReadingTime && matchesViewCount;
  });
});

const categoryTree = computed(() => {
  const map: Record<number, Category & { children: Category[] }> = {};
  const roots: (Category & { children: Category[] })[] = [];

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

// Actions
const navigateTo = (view: typeof currentView.value, data?: any) => {
  if (view === 'reading-list') {
    router.push('/reading-list');
  } else if (view === 'info-list') {
    router.push('/content-management');
  } else if (view === 'category-mgmt') {
    router.push('/category-management');
  } else if (view === 'article-editor') {
    if (data && data.id) {
      router.push(`/article/edit/${data.id}`);
    } else {
      router.push('/article/new');
    }
  } else if (view === 'article-detail') {
    if (data && data.id) {
      router.push(`/article/${data.id}`);
    }
  }
};

// Route Watcher to handle "page" state
watch(() => route.path, async (newPath) => {
  if (newPath === '/reading-list') {
    currentView.value = 'reading-list';
  } else if (newPath === '/content-management') {
    currentView.value = 'info-list';
  } else if (newPath === '/category-management') {
    currentView.value = 'category-mgmt';
    editingCategory.value = null;
  } else if (newPath === '/article/new') {
    currentView.value = 'article-editor';
    isPreviewMode.value = false;
    editingArticle.value = {
      title: '',
      subtitle: '',
      category_id: categories.value[0]?.id || 0,
      summary: '',
      content: '',
      status: 'draft',
      publish_date: new Date().toISOString().split('T')[0],
      view_count: 0,
      reading_time: 5,
      author: '管理员',
      allow_anonymous: true,
      allow_all_registered: false,
      allowed_roles: '',
      allowed_users: ''
    };
  } else if (newPath.startsWith('/article/edit/')) {
    const id = parseInt(newPath.split('/').pop() || '0');
    currentView.value = 'article-editor';
    isPreviewMode.value = false;
    if (articles.value.length === 0) await fetchData();
    const art = articles.value.find(a => a.id === id);
    if (art) editingArticle.value = { ...art };
  } else if (newPath.startsWith('/article/')) {
    const id = parseInt(newPath.split('/').pop() || '0');
    currentView.value = 'article-detail';
    if (articles.value.length === 0) await fetchData();
    const art = articles.value.find(a => a.id === id);
    if (art) {
      viewingArticle.value = art;
      // Increment view count locally for demo
      art.view_count++;
      fetchComments(id);
    }
  }
}, { immediate: true });

const saveArticle = async (article: Partial<Article>) => {
  const method = article.id ? 'PUT' : 'POST';
  const url = article.id ? `/api/articles/${article.id}` : '/api/articles';
  
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article)
    });
    if (res.ok) {
      await fetchData();
      navigateTo('info-list');
    }
  } catch (error) {
    console.error('Failed to save article:', error);
  }
};

const deleteArticle = async (id: number) => {
  if (!confirm('Are you sure you want to delete this article?')) return;
  try {
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchData();
  } catch (error) {
    console.error('Failed to delete article:', error);
  }
};

const saveCategory = async (category: Partial<Category>) => {
  const method = category.id ? 'PUT' : 'POST';
  const url = category.id ? `/api/categories/${category.id}` : '/api/categories';
  
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category)
    });
    if (res.ok) {
      await fetchData();
      editingCategory.value = null;
    }
  } catch (error) {
    console.error('Failed to save category:', error);
  }
};

const deleteCategory = async (id: number) => {
  if (!confirm('Are you sure? This will delete all subcategories.')) return;
  try {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchData();
  } catch (error) {
    console.error('Failed to delete category:', error);
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

const getCategoryName = (id: number) => {
  return categories.value.find(c => c.id === id)?.name || 'Unknown';
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

const toggleDropdown = (id: number) => {
  if (activeDropdownId.value === id) {
    activeDropdownId.value = null;
  } else {
    activeDropdownId.value = id;
  }
};

const handleMoreAction = async (action: string, article: Article) => {
  activeDropdownId.value = null;
  
  switch (action) {
    case 'preview':
      navigateTo('article-detail', article);
      break;
    case 'copy-link':
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/article/${article.id}`);
        alert('链接已复制到剪贴板');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      break;
    case 'pin':
      // Mock pin action
      alert(`已将文章 "${article.title}" 置顶`);
      break;
    case 'status-published':
    case 'status-draft':
    case 'status-archived':
      const newStatus = action.split('-')[1] as Article['status'];
      await saveArticle({ ...article, status: newStatus });
      break;
  }
};

// Close dropdown when clicking outside
onMounted(() => {
  window.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.more-actions-container')) {
      activeDropdownId.value = null;
    }
  });
});
</script>

<template>
  <div class="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
    <!-- Sidebar -->
    <aside 
      :class="[
        'bg-white border-r border-slate-200 transition-all duration-300 flex flex-col',
        isSidebarCollapsed ? 'w-20' : 'w-64'
      ]"
    >
      <div class="p-6 flex items-center justify-between border-b border-slate-100">
        <div v-if="!isSidebarCollapsed" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard :size="20" />
          </div>
          <span class="font-bold text-lg tracking-tight">信息中心</span>
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
        >
          <BookOpen :size="20" :class="currentView === 'reading-list' ? 'text-indigo-600' : 'group-hover:text-indigo-500'" />
          <span v-if="!isSidebarCollapsed" class="font-medium">阅读列表</span>
        </router-link>

        <router-link 
          to="/content-management"
          :class="[
            'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
            currentView === 'info-list' || currentView === 'article-editor' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
          ]"
        >
          <FileText :size="20" :class="currentView === 'info-list' || currentView === 'article-editor' ? 'text-indigo-600' : 'group-hover:text-indigo-500'" />
          <span v-if="!isSidebarCollapsed" class="font-medium">内容管理</span>
        </router-link>

        <router-link 
          to="/category-management"
          :class="[
            'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
            currentView === 'category-mgmt' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
          ]"
        >
          <FolderTree :size="20" :class="currentView === 'category-mgmt' ? 'text-indigo-600' : 'group-hover:text-indigo-500'" />
          <span v-if="!isSidebarCollapsed" class="font-medium">分类配置</span>
        </router-link>
      </nav>

      <div class="p-4 border-t border-slate-100">
        <div v-if="!isSidebarCollapsed" class="bg-slate-50 rounded-2xl p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white overflow-hidden">
              <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" referrerPolicy="no-referrer" />
            </div>
            <div>
              <p class="text-sm font-semibold">管理员</p>
              <p class="text-xs text-slate-400">系统管理员</p>
            </div>
          </div>
          <button class="w-full flex items-center justify-center gap-2 p-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            <Settings :size="14" />
            设置
          </button>
        </div>
        <div v-else class="flex justify-center">
          <div class="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white overflow-hidden cursor-pointer">
            <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <header class="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
          <button 
            v-if="currentView === 'article-detail'"
            @click="navigateTo('reading-list')"
            class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft :size="20" />
          </button>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ 
              currentView === 'reading-list' ? '阅读列表' : 
              currentView === 'info-list' ? '内容管理' : 
              currentView === 'category-mgmt' ? '分类配置' : 
              currentView === 'article-detail' ? '文章详情' :
              editingArticle?.id ? '编辑文章' : '发布文章'
            }}
          </h1>
        </div>

        <div class="flex items-center gap-4">
          <div class="relative hidden md:block">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" :size="18" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索内容..."
              class="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
            />
          </div>
          <button 
            v-if="currentView === 'info-list'"
            @click="navigateTo('article-editor')"
            class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm shadow-indigo-200"
          >
            <PlusCircle :size="18" />
            发布文章
          </button>
        </div>
      </header>

      <!-- View Area -->
      <div class="flex-1 overflow-y-auto p-8">
        <div v-if="isLoading" class="flex items-center justify-center h-full">
          <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-slate-500 font-medium">加载中...</p>
          </div>
        </div>

        <div v-else class="max-w-7xl mx-auto">
          <!-- Reading List View -->
          <div v-if="currentView === 'reading-list'" class="space-y-8">
            <div class="flex items-center justify-between">
              <div class="flex gap-2">
                <button 
                  @click="selectedCategoryId = null"
                  :class="[
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    !selectedCategoryId ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                  ]"
                >
                  全部
                </button>
                <button 
                  v-for="cat in categories.filter(c => !c.parent_id)"
                  :key="cat.id"
                  @click="selectedCategoryId = cat.id!"
                  :class="[
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    selectedCategoryId === cat.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                  ]"
                >
                  {{ cat.name }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <span class="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">
                      {{ getCategoryName(article.category_id) }}
                    </span>
                  </div>
                </div>
                <div class="p-6 flex-1 flex flex-col">
                  <div class="flex items-center gap-4 text-xs text-slate-400 mb-3">
                    <span class="flex items-center gap-1"><Clock :size="14" /> {{ article.publish_date }}</span>
                    <span class="flex items-center gap-1"><Eye :size="14" /> {{ article.view_count }}</span>
                  </div>
                  <h3 class="text-xl font-bold mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">{{ article.title }}</h3>
                  <p class="text-slate-500 text-sm mb-6 line-clamp-3 leading-relaxed">{{ article.summary }}</p>
                  <div class="mt-auto flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-400">{{ article.reading_time }} min read</span>
                    <button 
                      @click="navigateTo('article-detail', article)"
                      class="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      阅读更多 <ChevronRight :size="16" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="filteredArticles.length === 0" class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <Search :size="40" />
              </div>
              <h3 class="text-lg font-semibold text-slate-900">未找到相关文章</h3>
              <p class="text-slate-500">尝试更换搜索关键词或分类</p>
            </div>
          </div>

          <!-- Article Detail View -->
          <div v-else-if="currentView === 'article-detail' && viewingArticle" class="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="aspect-[21/9] relative overflow-hidden">
              <img 
                :src="viewingArticle.thumbnail_url || `https://picsum.photos/seed/${viewingArticle.id}/1200/600`" 
                class="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
                <div class="space-y-2">
                  <span class="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                    {{ getCategoryName(viewingArticle.category_id) }}
                  </span>
                  <h2 class="text-3xl md:text-4xl font-bold text-white leading-tight">{{ viewingArticle.title }}</h2>
                </div>
              </div>
            </div>
            
            <div class="p-8 md:p-12">
              <div class="flex flex-wrap items-center gap-6 text-sm text-slate-400 mb-8 pb-8 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User :size="16" />
                  </div>
                  <span class="font-medium text-slate-700">{{ viewingArticle.author }}</span>
                </div>
                <span class="flex items-center gap-1.5"><Clock :size="16" /> {{ viewingArticle.publish_date }}</span>
                <span class="flex items-center gap-1.5"><Eye :size="16" /> {{ viewingArticle.view_count }} 次阅读</span>
                <span class="flex items-center gap-1.5"><BookOpen :size="16" /> {{ viewingArticle.reading_time }} 分钟阅读</span>
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
                  <h3 class="text-2xl font-bold">评论 ({{ comments.length }})</h3>
                </div>

                <!-- Comment Form -->
                <div class="bg-slate-50 rounded-3xl p-6 md:p-8 mb-12">
                  <h4 class="text-lg font-bold mb-4">发表评论</h4>
                  <div class="space-y-4">
                    <div>
                      <input 
                        v-model="newComment.author"
                        type="text" 
                        placeholder="您的称呼" 
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <textarea 
                        v-model="newComment.content"
                        rows="4" 
                        placeholder="写下您的想法..." 
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                      ></textarea>
                    </div>
                    <div class="flex justify-end">
                      <button 
                        @click="submitComment"
                        class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                      >
                        <Send :size="18" /> 提交评论
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
                    目前还没有评论，快来抢沙发吧！
                  </div>
                </div>
              </div>
              
              <div class="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                <button 
                  @click="navigateTo('reading-list')"
                  class="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                >
                  <ArrowLeft :size="18" /> 返回列表
                </button>
                
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400 uppercase tracking-widest font-bold">分享文章</span>
                  <div class="flex gap-2">
                    <button class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                      <LinkIcon :size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Content Management View -->
          <div v-else-if="currentView === 'info-list'" class="space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button 
                    v-for="status in ['all', 'published', 'draft', 'archived', 'pending'] as const"
                    :key="status"
                    @click="selectedStatus = status; selectedArticleIds = []"
                    :class="[
                      'px-6 py-2 rounded-lg text-sm font-bold transition-all capitalize',
                      selectedStatus === status ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:text-slate-900'
                    ]"
                  >
                    {{ status === 'all' ? '全部' : status === 'published' ? '已发布' : status === 'draft' ? '草稿' : status === 'archived' ? '已归档' : '待审核' }}
                  </button>
                </div>

                <!-- Bulk Actions -->
                <transition enter-active-class="transition duration-200 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
                  <div v-if="selectedArticleIds.length > 0" class="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-xl">
                    <span class="text-xs font-bold text-indigo-600">已选中 {{ selectedArticleIds.length }} 项</span>
                    <div class="w-[1px] h-4 bg-indigo-200 mx-1"></div>
                    <button @click="bulkDelete" class="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1">
                      <Trash2 :size="14" /> 批量删除
                    </button>
                    <button class="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
                      <Edit2 :size="14" /> 批量修改
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
                  高级筛选
                </button>
                <button 
                  @click="exportArticles"
                  class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 shadow-sm hover:border-indigo-300 transition-all"
                >
                  <Download :size="16" />
                  导出
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
                    <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">分类</label>
                    <select 
                      v-model="selectedCategoryId"
                      class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option :value="null">全部分类</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">作者</label>
                    <input 
                      v-model="advancedFilters.author"
                      type="text" 
                      placeholder="搜索作者..."
                      class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">发布日期范围</label>
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
                    <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">阅读时长 (分钟)</label>
                    <div class="flex items-center gap-2">
                      <input 
                        v-model.number="advancedFilters.minReadingTime"
                        type="number" 
                        placeholder="最小"
                        class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <span class="text-slate-400">-</span>
                      <input 
                        v-model.number="advancedFilters.maxReadingTime"
                        type="number" 
                        placeholder="最大"
                        class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-700 uppercase tracking-wider">浏览量范围</label>
                    <div class="flex items-center gap-2">
                      <input 
                        v-model.number="advancedFilters.minViewCount"
                        type="number" 
                        placeholder="最小"
                        class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <span class="text-slate-400">-</span>
                      <input 
                        v-model.number="advancedFilters.maxViewCount"
                        type="number" 
                        placeholder="最大"
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
                    重置筛选
                  </button>
                  <button 
                    @click="isAdvancedFilterOpen = false"
                    class="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                  >
                    完成筛选
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
                      <th class="px-6 py-5">文章详情</th>
                      <th class="px-6 py-5">分类</th>
                      <th class="px-6 py-5">状态</th>
                      <th class="px-6 py-5">发布日期</th>
                      <th class="px-6 py-5">互动数据</th>
                      <th class="px-8 py-5 text-right">操作</th>
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
                              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{{ article.author || '管理员' }}</span>
                              <span class="text-[10px] text-slate-300">|</span>
                              <span class="text-[10px] text-slate-400">{{ article.reading_time }} min read</span>
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
                          <span class="text-[10px] text-slate-400">最后更新</span>
                        </div>
                      </td>
                      <td class="px-6 py-5">
                        <div class="flex items-center gap-4">
                          <div class="flex flex-col">
                            <span class="text-sm font-bold text-slate-900">{{ article.view_count }}</span>
                            <span class="text-[10px] text-slate-400 flex items-center gap-1"><Eye :size="10" /> 浏览量</span>
                          </div>
                        </div>
                      </td>
                      <td class="px-8 py-5 text-right">
                        <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button @click="navigateTo('article-editor', article)" class="p-2.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all" title="编辑">
                            <Edit2 :size="16" />
                          </button>
                          <button @click="deleteArticle(article.id!)" class="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all" title="删除">
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
                                <ExternalLink :size="14" /> 预览文章
                              </button>
                              <button @click="handleMoreAction('copy-link', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                <Copy :size="14" /> 复制链接
                              </button>
                              <button @click="handleMoreAction('pin', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                <Pin :size="14" /> 置顶文章
                              </button>
                              <div class="my-1 border-t border-slate-50"></div>
                              <div class="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">更改状态</div>
                              <button @click="handleMoreAction('status-published', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                <CheckCircle2 :size="14" /> 发布
                              </button>
                              <button @click="handleMoreAction('status-draft', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                                <Clock :size="14" /> 设为草稿
                              </button>
                              <button @click="handleMoreAction('status-archived', article)" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                                <AlertCircle :size="14" /> 归档
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
          </div>

          <!-- Category Management View -->
          <div v-else-if="currentView === 'category-mgmt'" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 space-y-6">
              <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-bold text-lg">分类目录</h3>
                  <button @click="editingCategory = {}" class="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                    <PlusCircle :size="18" />
                  </button>
                </div>
                <div class="space-y-1">
                  <div v-for="cat in categoryTree" :key="cat.id" class="space-y-1">
                    <div 
                      @click="editingCategory = cat"
                      :class="[
                        'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group',
                        editingCategory?.id === cat.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50'
                      ]"
                    >
                      <div class="flex items-center gap-3">
                        <FolderTree :size="18" :class="editingCategory?.id === cat.id ? 'text-indigo-600' : 'text-slate-400'" />
                        <span class="text-sm font-medium">{{ cat.name }}</span>
                      </div>
                      <button @click.stop="deleteCategory(cat.id!)" class="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 transition-all">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                    <!-- Subcategories -->
                    <div v-if="cat.children.length" class="pl-6 space-y-1">
                      <div 
                        v-for="sub in cat.children" 
                        :key="sub.id"
                        @click="editingCategory = sub"
                        :class="[
                          'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all group',
                          editingCategory?.id === sub.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50'
                        ]"
                      >
                        <div class="flex items-center gap-3">
                          <div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                          <span class="text-sm font-medium">{{ sub.name }}</span>
                        </div>
                        <button @click.stop="deleteCategory(sub.id!)" class="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 transition-all">
                          <Trash2 :size="14" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="lg:col-span-2">
              <div v-if="editingCategory" class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 class="font-bold text-xl mb-8">{{ editingCategory.id ? '编辑分类' : '新增分类' }}</h3>
                <form @submit.prevent="saveCategory(editingCategory!)" class="space-y-6">
                  <div class="grid grid-cols-2 gap-6">
                    <div class="space-y-2">
                      <label class="text-sm font-bold text-slate-700">分类名称</label>
                      <input 
                        v-model="editingCategory.name"
                        type="text" 
                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="text-sm font-bold text-slate-700">父级分类</label>
                      <select 
                        v-model="editingCategory.parent_id"
                        class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option :value="null">无</option>
                        <option v-for="cat in categories.filter(c => c.id !== editingCategory?.id)" :key="cat.id" :value="cat.id">
                          {{ cat.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-bold text-slate-700">描述</label>
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
                        <p class="text-sm font-bold">公开显示</p>
                        <p class="text-xs text-slate-400">控制该分类是否在前端展示</p>
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
                      取消
                    </button>
                    <button 
                      type="submit"
                      class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      保存分类
                    </button>
                  </div>
                </form>
              </div>
              <div v-else class="h-full flex flex-col items-center justify-center p-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                  <FolderTree :size="32" />
                </div>
                <h3 class="text-lg font-bold text-slate-900">选择一个分类进行编辑</h3>
                <p class="text-slate-500 text-sm">或点击右上角按钮创建新分类</p>
              </div>
            </div>
          </div>

          <!-- Article Editor View -->
          <div v-else-if="currentView === 'article-editor' && editingArticle" class="h-full flex flex-col -m-8">
            <!-- Editor Header -->
            <div class="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-4">
                <button @click="navigateTo('info-list')" class="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
                  <ArrowLeft :size="20" />
                </button>
                <div class="h-6 w-[1px] bg-slate-200"></div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-slate-900">{{ editingArticle.id ? '编辑文章' : '新文章' }}</span>
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
                >
                  <Eye :size="18" />
                  {{ isPreviewMode ? '退出预览' : '预览' }}
                </button>
                <button 
                  @click="saveArticle({ ...editingArticle, status: 'draft' })"
                  class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  保存草稿
                </button>
                <div class="flex items-center">
                  <button 
                    @click="saveArticle({ ...editingArticle, status: 'published' })"
                    class="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-l-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Save :size="18" />
                    发布
                  </button>
                  <button class="px-2 py-2 bg-indigo-600 text-white rounded-r-xl border-l border-indigo-500 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
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
                      placeholder="输入引人入胜的标题..."
                      rows="1"
                      class="w-full text-5xl font-black border-none focus:ring-0 placeholder:text-slate-200 p-0 resize-none leading-tight"
                      @input="(e) => { (e.target as HTMLTextAreaElement).style.height = 'auto'; (e.target as HTMLTextAreaElement).style.height = (e.target as HTMLTextAreaElement).scrollHeight + 'px' }"
                    ></textarea>
                    <input 
                      v-model="editingArticle.subtitle"
                      type="text" 
                      placeholder="添加副标题或作者信息..."
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
                      <span>字数: {{ wordCount }}</span>
                      <span>预计阅读: {{ Math.ceil(wordCount / 500) }} 分钟</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <CheckCircle2 :size="12" class="text-emerald-500" />
                      <span>所有更改已保存</span>
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
                  <h1 class="text-5xl font-black leading-tight mb-4">{{ editingArticle.title || '无标题' }}</h1>
                  <p class="text-xl text-slate-400 mb-8">{{ editingArticle.subtitle }}</p>
                  <div class="flex items-center gap-4 mb-12 pb-12 border-b border-slate-100">
                    <div class="w-12 h-12 rounded-full bg-slate-100 overflow-hidden">
                      <img src="https://picsum.photos/seed/author/100/100" class="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <p class="font-bold text-slate-900">{{ editingArticle.author || '管理员' }}</p>
                      <p class="text-xs text-slate-400">{{ editingArticle.publish_date }} · {{ editingArticle.reading_time }} min read</p>
                    </div>
                  </div>
                  <div class="prose prose-slate prose-lg max-w-none font-serif leading-relaxed text-slate-700" v-html="editingArticle.content || '暂无内容'">
                  </div>
                </div>
              </div>

              <!-- Sidebar Settings -->
              <div class="w-80 border-l border-slate-200 bg-slate-50/50 overflow-y-auto p-6 space-y-8">
                <div class="space-y-4">
                  <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">文章设置</h3>
                  
                  <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-700">分类</label>
                    <select 
                      v-model="editingArticle.category_id"
                      class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                    >
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-700">发布日期</label>
                    <input 
                      v-model="editingArticle.publish_date"
                      type="date"
                      class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-700">预计阅读时间 (分钟)</label>
                    <input 
                      v-model="editingArticle.reading_time"
                      type="number"
                      class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                    />
                  </div>
                </div>

                <div class="space-y-4">
                  <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">封面与摘要</h3>
                  
                  <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-700">封面图</label>
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
                          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">点击选择封面图</p>
                        </div>
                      </template>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-700">摘要</label>
                    <textarea 
                      v-model="editingArticle.summary"
                      rows="4"
                      placeholder="简短的文章介绍..."
                      class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all resize-none"
                    ></textarea>
                  </div>
                </div>

                <div class="pt-6 border-t border-slate-200 space-y-4">
                  <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">授权设置</h3>
                  
                  <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <Eye :size="16" />
                        </div>
                        <div>
                          <p class="text-xs font-bold text-slate-700">允许匿名查看</p>
                          <p class="text-[10px] text-slate-400">未登录用户可见</p>
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
                            <p class="text-xs font-bold text-slate-700">仅注册用户可见</p>
                            <p class="text-[10px] text-slate-400">所有登录用户均可访问</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          v-model="editingArticle.allow_all_registered"
                          class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>

                      <div v-if="!editingArticle.allow_all_registered" class="space-y-4">
                        <div class="space-y-2">
                          <div class="flex items-center justify-between">
                            <label class="text-xs font-bold text-slate-700 flex items-center gap-2">
                              <Users :size="14" class="text-slate-400" />
                              指定角色
                            </label>
                            <button 
                              type="button"
                              @click="isRoleModalOpen = true"
                              class="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              选择角色
                            </button>
                          </div>
                          <div class="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[40px]">
                            <template v-if="editingArticle.allowed_roles">
                              <span 
                                v-for="role in editingArticle.allowed_roles.split(',')" 
                                :key="role"
                                class="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 flex items-center gap-1 shadow-sm"
                              >
                                {{ role }}
                                <button @click="() => {
                                  const roles = editingArticle.allowed_roles!.split(',');
                                  const idx = roles.indexOf(role);
                                  if (idx > -1) roles.splice(idx, 1);
                                  editingArticle.allowed_roles = roles.join(',');
                                }" class="hover:text-red-500 transition-colors">
                                  <X :size="10" />
                                </button>
                              </span>
                            </template>
                            <p v-else class="text-[10px] text-slate-300 italic">未选择角色</p>
                          </div>
                        </div>

                        <div class="space-y-2">
                          <div class="flex items-center justify-between">
                            <label class="text-xs font-bold text-slate-700 flex items-center gap-2">
                              <User :size="14" class="text-slate-400" />
                              指定人员
                            </label>
                            <button 
                              type="button"
                              @click="isUserModalOpen = true"
                              class="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              选择人员
                            </button>
                          </div>
                          <div class="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[40px]">
                            <template v-if="editingArticle.allowed_users">
                              <span 
                                v-for="user in editingArticle.allowed_users.split(',')" 
                                :key="user"
                                class="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 flex items-center gap-1 shadow-sm"
                              >
                                {{ user }}
                                <button @click="() => {
                                  const users = editingArticle.allowed_users!.split(',');
                                  const idx = users.indexOf(user);
                                  if (idx > -1) users.splice(idx, 1);
                                  editingArticle.allowed_users = users.join(',');
                                }" class="hover:text-red-500 transition-colors">
                                  <X :size="10" />
                                </button>
                              </span>
                            </template>
                            <p v-else class="text-[10px] text-slate-300 italic">未选择人员</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pt-6 border-t border-slate-200">
                  <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <AlertCircle :size="16" />
                      </div>
                      <span class="text-xs font-bold text-slate-700">允许评论</span>
                    </div>
                    <div class="w-10 h-5 bg-slate-200 rounded-full relative cursor-pointer">
                      <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <!-- Selection Modals -->
    <SelectionModal 
      :is-open="isRoleModalOpen"
      title="选择指定角色"
      :items="mockRoles"
      :selected-items="editingArticle?.allowed_roles ? editingArticle.allowed_roles.split(',') : []"
      @close="isRoleModalOpen = false"
      @confirm="handleRoleConfirm"
    />

    <SelectionModal 
      :is-open="isUserModalOpen"
      title="选择指定人员"
      :items="mockUsers"
      :selected-items="editingArticle?.allowed_users ? editingArticle.allowed_users.split(',') : []"
      @close="isUserModalOpen = false"
      @confirm="handleUserConfirm"
    />

    <ImageSelectorModal 
      :is-open="isImageSelectorOpen"
      :current-image-url="editingArticle?.thumbnail_url"
      @close="isImageSelectorOpen = false"
      @confirm="handleCoverImageConfirm"
    />
  </div>
</template>

<style>
@import "tailwindcss";

:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}

body {
  font-family: var(--font-sans);
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
