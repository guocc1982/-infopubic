<script setup lang="ts">
import { inject, ref } from 'vue';
import { X, AlertTriangle } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}>();

const emit = defineEmits(['close', 'confirm']);
const { t } = useI18n();
const systemSettings = inject('systemSettings', ref({ primary_color: '#4f46e5' }));

const handleConfirm = () => {
  emit('confirm');
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div class="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
      <div class="p-6 flex flex-col items-center text-center">
        <div 
          class="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          :class="{
            'bg-rose-100 text-rose-600': type === 'danger' || !type,
            'bg-amber-100 text-amber-600': type === 'warning',
            'bg-indigo-100 text-indigo-600': type === 'info'
          }"
        >
          <AlertTriangle :size="32" />
        </div>
        <h3 class="text-xl font-black text-slate-900 mb-2">{{ title }}</h3>
        <p class="text-slate-500 text-sm leading-relaxed">{{ message }}</p>
      </div>
      
      <div class="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button 
          @click="$emit('close')" 
          class="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
        >
          {{ cancelText || t('common.cancel') || 'Cancel' }}
        </button>
        <button 
          @click="handleConfirm" 
          class="flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all shadow-lg"
          :class="{
            'bg-rose-600 hover:bg-rose-700 shadow-rose-200': type === 'danger' || !type,
            'bg-amber-600 hover:bg-amber-700 shadow-amber-200': type === 'warning',
            'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200': type === 'info'
          }"
        >
          {{ confirmText || t('common.confirm') || 'Confirm' }}
        </button>
      </div>
    </div>
  </div>
</template>
