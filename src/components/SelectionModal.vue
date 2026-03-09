<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <h3 class="text-lg font-black text-slate-900">{{ title }}</h3>
        <button @click="$emit('close')" class="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
          <X :size="20" />
        </button>
      </div>
      
      <div class="p-6 space-y-4">
        <div class="relative">
          <Search :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索..."
            class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        
        <div class="max-h-64 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
          <label 
            v-for="item in filteredItems" 
            :key="item"
            class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
          >
            <input 
              type="checkbox" 
              :value="item"
              v-model="localSelected"
              class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
            />
            <span class="text-sm font-medium text-slate-700 group-hover:text-slate-900">{{ item }}</span>
          </label>
          <div v-if="filteredItems.length === 0" class="py-12 text-center">
            <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-3">
              <Search :size="24" />
            </div>
            <p class="text-sm text-slate-400">未找到匹配项</p>
          </div>
        </div>
      </div>
      
      <div class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div class="flex gap-2">
          <button 
            @click="selectAll" 
            class="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
          >
            全选过滤项
          </button>
          <span class="text-slate-200">|</span>
          <button 
            @click="localSelected = []" 
            class="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
          >
            清除全部
          </button>
        </div>
        <div class="flex gap-3">
          <button @click="$emit('close')" class="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">取消</button>
          <button @click="confirm" class="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Search } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  items: string[];
  selectedItems: string[];
}>();

const emit = defineEmits(['close', 'confirm']);

const searchQuery = ref('');
const localSelected = ref<string[]>([]);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    localSelected.value = [...props.selectedItems];
    searchQuery.value = '';
  }
});

const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items;
  const query = searchQuery.value.toLowerCase();
  return props.items.filter(item => item.toLowerCase().includes(query));
});

const selectAll = () => {
  const currentFiltered = filteredItems.value;
  const newSelected = new Set([...localSelected.value, ...currentFiltered]);
  localSelected.value = Array.from(newSelected);
};

const confirm = () => {
  emit('confirm', localSelected.value);
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
