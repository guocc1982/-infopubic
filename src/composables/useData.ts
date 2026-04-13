import { ref } from 'vue';
import type { Category, Article } from '../types';
import { useApi } from './useApi';

const categories = ref<Category[]>([]);
const articles = ref<Article[]>([]);
const isLoading = ref(false);
const isInitialized = ref(false);
const tenantId = ref(localStorage.getItem('tenantId') || 'default');
const searchQuery = ref('');

export function useData() {
  const { apiFetch } = useApi();

  const setTenantId = (id: string) => {
    tenantId.value = id;
    localStorage.setItem('tenantId', id);
    fetchData(true);
  };

  const fetchData = async (force = false) => {
    if (isInitialized.value && !force && articles.value.length > 0) return;
    
    isLoading.value = true;
    try {
      console.log('Fetching data from API for tenant:', tenantId.value, { force });

      const [catsRes, artsRes] = await Promise.all([
        apiFetch('/api/categories').catch(err => ({ ok: false, status: 0, statusText: err.message })),
        apiFetch('/api/articles').catch(err => ({ ok: false, status: 0, statusText: err.message }))
      ]);
      
      if (!catsRes.ok) console.error('Failed to fetch categories:', catsRes.statusText);
      if (!artsRes.ok) console.error('Failed to fetch articles:', artsRes.statusText);

      if (catsRes.ok) categories.value = await (catsRes as Response).json();
      if (artsRes.ok) articles.value = await (artsRes as Response).json();
      
      if (catsRes.ok || artsRes.ok) {
        isInitialized.value = true;
      } else {
        throw new Error('Failed to fetch both categories and articles');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const getCategoryName = (id: number | null | undefined) => {
    if (!id) return '';
    const cat = categories.value.find(c => c.id === id);
    return cat ? cat.name : '';
  };

  return {
    categories,
    articles,
    isLoading,
    isInitialized,
    tenantId,
    searchQuery,
    setTenantId,
    fetchData,
    getCategoryName
  };
}
