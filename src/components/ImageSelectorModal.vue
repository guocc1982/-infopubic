<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="$emit('close')"></div>
      
      <div class="relative bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <!-- Header -->
        <div class="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">选择封面图</h2>
            <p class="text-sm text-slate-400 font-medium mt-1">上传图片或从图库中选择</p>
          </div>
          <button @click="$emit('close')" class="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X :size="24" />
          </button>
        </div>

        <!-- Search & Tabs -->
        <div class="px-8 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" :size="18" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索图库内容..."
              class="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="triggerUpload"
              class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <Upload :size="16" />
              本地上传
            </button>
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*" 
              class="hidden" 
              @change="handleFileUpload"
            />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-8">
          <div v-if="filteredGallery.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div 
              v-for="img in filteredGallery" 
              :key="img.url"
              @click="selectedUrl = img.url"
              :class="[
                'relative aspect-video rounded-2xl overflow-hidden cursor-pointer border-4 transition-all group',
                selectedUrl === img.url ? 'border-indigo-600 shadow-xl scale-[0.98]' : 'border-transparent hover:border-indigo-200'
              ]"
            >
              <img :src="img.url" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
              <div v-if="selectedUrl === img.url" class="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
                  <Check :size="18" />
                </div>
              </div>
              <div class="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="text-[10px] text-white font-bold truncate">{{ img.name }}</p>
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-20 text-slate-300">
            <Search :size="48" class="mb-4 opacity-20" />
            <p class="font-bold">未找到匹配的图片</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div v-if="selectedUrl" class="w-16 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
              <img :src="selectedUrl" class="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <p v-if="selectedUrl" class="text-xs font-bold text-slate-500">已选择图片</p>
            <p v-else class="text-xs font-bold text-slate-400">请选择一张图片作为封面</p>
          </div>
          <div class="flex gap-3">
            <button @click="$emit('close')" class="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">取消</button>
            <button 
              @click="confirm" 
              :disabled="!selectedUrl"
              class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Search, Upload, Check } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  currentImageUrl?: string;
}>();

const emit = defineEmits(['close', 'confirm']);

const searchQuery = ref('');
const selectedUrl = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const galleryImages = [
  { name: '科技办公', url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80' },
  { name: '自然风光', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80' },
  { name: '城市建筑', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80' },
  { name: '极简设计', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80' },
  { name: '团队协作', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80' },
  { name: '创意灵感', url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
  { name: '商务会议', url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80' },
  { name: '抽象艺术', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80' },
  { name: '数据分析', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' },
  { name: '咖啡时光', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80' },
  { name: '星空宇宙', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=800&q=80' },
  { name: '绿色生态', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80' },
];

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    selectedUrl.value = props.currentImageUrl || '';
    searchQuery.value = '';
  }
});

const filteredGallery = computed(() => {
  if (!searchQuery.value) return galleryImages;
  const query = searchQuery.value.toLowerCase();
  return galleryImages.filter(img => img.name.toLowerCase().includes(query));
});

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedUrl.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const confirm = () => {
  emit('confirm', selectedUrl.value);
};
</script>
