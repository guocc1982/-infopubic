<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { ChevronRight, ChevronDown, FolderTree, Trash2, Search } from 'lucide-vue-next';
import type { Category } from '../types';

interface TreeCategory extends Category {
  children: TreeCategory[];
}

const props = defineProps<{
  item: TreeCategory;
  selectedId?: number;
  searchQuery: string;
  depth: number;
}>();

const emit = defineEmits(['select', 'delete']);

// Inject system settings from App.vue
const systemSettings = inject('systemSettings', ref({ primary_color: '#4f46e5' }));

const isExpanded = ref(true);

const hasChildren = computed(() => props.item.children && props.item.children.length > 0);

const isMatch = computed(() => {
  if (!props.searchQuery) return true;
  return props.item.name.toLowerCase().includes(props.searchQuery.toLowerCase());
});

const shouldShow = computed(() => {
  if (!props.searchQuery) return true;
  if (isMatch.value) return true;
  // If any child should be shown, this parent should be shown too
  return props.item.children.some(child => checkAnyChildMatch(child, props.searchQuery));
});

function checkAnyChildMatch(cat: TreeCategory, query: string): boolean {
  if (cat.name.toLowerCase().includes(query.toLowerCase())) return true;
  return cat.children.some(child => checkAnyChildMatch(child, query));
}

// Auto-expand if searching and there's a match in children
computed(() => {
  if (props.searchQuery && shouldShow.value && !isMatch.value) {
    isExpanded.value = true;
  }
});

const toggleExpand = (e: Event) => {
  e.stopPropagation();
  isExpanded.value = !isExpanded.value;
};
</script>

<template>
  <div v-if="shouldShow" class="space-y-1">
    <div 
      @click="emit('select', item)"
      :class="[
        'flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all group relative',
        selectedId === item.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50'
      ]"
      :style="[
        { paddingLeft: `${depth * 1.25 + 0.75}rem` },
        selectedId === item.id ? { color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)` } : {}
      ]"
    >
      <div class="flex items-center gap-2 overflow-hidden">
        <button 
          v-if="hasChildren" 
          @click="toggleExpand"
          class="p-0.5 hover:bg-slate-200 rounded transition-colors text-slate-400"
        >
          <ChevronDown v-if="isExpanded" :size="14" />
          <ChevronRight v-else :size="14" />
        </button>
        <div v-else class="w-5"></div>
        
        <FolderTree :size="16" :class="selectedId === item.id ? 'text-indigo-600' : 'text-slate-400'" class="shrink-0" :style="selectedId === item.id ? { color: systemSettings.primary_color } : {}" />
        <span 
          class="text-sm font-medium truncate"
          :class="{ 'text-indigo-600 font-bold': searchQuery && isMatch }"
          :style="searchQuery && isMatch ? { color: systemSettings.primary_color } : {}"
        >
          {{ item.name }}
        </span>
      </div>
      
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button 
          @click.stop="emit('delete', item.id)" 
          class="p-1.5 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-slate-400 transition-all"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <div v-if="hasChildren && isExpanded" class="space-y-1">
      <CategoryTreeItem 
        v-for="child in item.children" 
        :key="child.id"
        :item="child"
        :selected-id="selectedId"
        :search-query="searchQuery"
        :depth="depth + 1"
        @select="emit('select', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>
