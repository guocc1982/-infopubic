<script setup lang="ts">
import { computed, ref, inject } from 'vue';
import { ChevronDown, ChevronRight, Check } from 'lucide-vue-next';
import type { Category } from '../types';

interface TreeCategory extends Category {
  children: TreeCategory[];
}

const props = defineProps<{
  node: TreeCategory;
  selectedId: number | null;
  depth: number;
}>();

const emit = defineEmits(['select']);

// Inject system settings from App.vue
const systemSettings = inject('systemSettings', ref({ primary_color: '#4f46e5' }));

const isExpanded = ref(true);
const hasChildren = computed(() => props.node.children && props.node.children.length > 0);
</script>

<template>
  <div class="space-y-0.5">
    <div 
      @click="emit('select', node.id)"
      class="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors group"
      :class="selectedId === node.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-600'"
      :style="[
        { paddingLeft: (depth * 12 + 8) + 'px' },
        selectedId === node.id ? { color: systemSettings.primary_color, backgroundColor: `color-mix(in srgb, ${systemSettings.primary_color} 10%, white)` } : {}
      ]"
    >
      <div class="flex items-center gap-2 overflow-hidden">
        <div v-if="hasChildren" @click.stop="isExpanded = !isExpanded" class="p-0.5 hover:bg-slate-200 rounded transition-colors">
          <ChevronDown v-if="isExpanded" :size="12" />
          <ChevronRight v-else :size="12" />
        </div>
        <div v-else class="w-4"></div>
        <span class="text-xs font-medium truncate">{{ node.name }}</span>
      </div>
      <Check v-if="selectedId === node.id" :size="12" class="text-indigo-600" :style="{ color: systemSettings.primary_color }" />
    </div>
    <div v-if="hasChildren && isExpanded" class="space-y-0.5">
      <RecursiveCategoryItem 
        v-for="child in node.children" 
        :key="child.id" 
        :node="child" 
        :selected-id="selectedId"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
