<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Search, ChevronDown, ChevronRight, FolderTree, Check } from 'lucide-vue-next';
import type { Category } from '../types';

interface TreeCategory extends Category {
  children: TreeCategory[];
}

const props = defineProps<{
  modelValue: number | null;
  categories: Category[];
  placeholder?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const searchQuery = ref('');
const containerRef = ref<HTMLElement | null>(null);

const categoryTree = computed(() => {
  const map: Record<number, TreeCategory> = {};
  const roots: TreeCategory[] = [];

  props.categories.forEach(cat => {
    map[cat.id!] = { ...cat, children: [] };
  });

  props.categories.forEach(cat => {
    if (cat.parent_id && map[cat.parent_id]) {
      map[cat.parent_id].children.push(map[cat.id!]);
    } else {
      roots.push(map[cat.id!]);
    }
  });

  return roots;
});

const selectedCategory = computed(() => {
  return props.categories.find(c => c.id === props.modelValue);
});

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

const selectCategory = (id: number) => {
  emit('update:modelValue', id);
  isOpen.value = false;
};

// Recursive filter function
const filterTree = (nodes: TreeCategory[], query: string): TreeCategory[] => {
  if (!query) return nodes;
  
  return nodes.reduce((acc: TreeCategory[], node) => {
    const isMatch = node.name.toLowerCase().includes(query.toLowerCase());
    const filteredChildren = filterTree(node.children, query);
    
    if (isMatch || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren
      });
    }
    return acc;
  }, []);
};

const filteredTree = computed(() => {
  return filterTree(categoryTree.value, searchQuery.value);
});
</script>

<template>
  <div class="relative" ref="containerRef">
    <div 
      @click="isOpen = !isOpen"
      class="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all shadow-sm"
    >
      <div class="flex items-center gap-2 overflow-hidden">
        <FolderTree :size="16" class="text-slate-400 shrink-0" />
        <span v-if="selectedCategory" class="truncate font-medium text-slate-700">{{ selectedCategory.name }}</span>
        <span v-else class="text-slate-400">{{ placeholder || 'Select Category' }}</span>
      </div>
      <ChevronDown :size="16" class="text-slate-400 transition-transform" :class="{ 'rotate-180': isOpen }" />
    </div>

    <div 
      v-if="isOpen"
      class="absolute z-[100] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div class="p-3 border-b border-slate-50">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" :size="14" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search categories..."
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            @click.stop
          />
        </div>
      </div>

      <div class="max-h-64 overflow-y-auto p-2 custom-scrollbar">
        <!-- None Option -->
        <div 
          v-if="!searchQuery"
          @click="selectCategory(null as any)"
          class="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors mb-1"
          :class="modelValue === null ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'"
        >
          <div class="flex items-center gap-2">
            <div class="w-4"></div>
            <span class="text-xs font-medium">{{ placeholder || 'None' }}</span>
          </div>
          <Check v-if="modelValue === null" :size="12" class="text-indigo-600" />
        </div>

        <div v-if="filteredTree.length === 0 && searchQuery" class="p-8 text-center text-slate-400 text-xs italic">
          No categories found
        </div>
        <div v-else class="space-y-0.5">
          <RecursiveItem 
            v-for="node in filteredTree" 
            :key="node.id" 
            :node="node" 
            :selected-id="modelValue"
            :depth="0"
            @select="selectCategory"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Internal recursive component
const RecursiveItem = {
  name: 'RecursiveItem',
  props: ['node', 'selectedId', 'depth'],
  emits: ['select'],
  setup(props: any, { emit }: any) {
    const isExpanded = ref(true);
    const hasChildren = computed(() => props.node.children && props.node.children.length > 0);
    
    return { isExpanded, hasChildren, emit };
  },
  template: `
    <div class="space-y-0.5">
      <div 
        @click="emit('select', node.id)"
        class="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors group"
        :class="selectedId === node.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'"
        :style="{ paddingLeft: (depth * 12 + 8) + 'px' }"
      >
        <div class="flex items-center gap-2 overflow-hidden">
          <div v-if="hasChildren" @click.stop="isExpanded = !isExpanded" class="p-0.5 hover:bg-slate-200 rounded transition-colors">
            <ChevronDown v-if="isExpanded" :size="12" />
            <ChevronRight v-else :size="12" />
          </div>
          <div v-else class="w-4"></div>
          <span class="text-xs font-medium truncate">{{ node.name }}</span>
        </div>
        <Check v-if="selectedId === node.id" :size="12" class="text-indigo-600" />
      </div>
      <div v-if="hasChildren && isExpanded" class="space-y-0.5">
        <RecursiveItem 
          v-for="child in node.children" 
          :key="child.id" 
          :node="child" 
          :selected-id="selectedId"
          :depth="depth + 1"
          @select="emit('select', $event)"
        />
      </div>
    </div>
  `
};
</script>
