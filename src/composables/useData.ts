import { ref } from 'vue';
import type { Category, Article } from '../types';

const categories = ref<Category[]>([]);
const articles = ref<Article[]>([]);
const isLoading = ref(false);
const isInitialized = ref(false);
const tenantId = ref(localStorage.getItem('tenantId') || 'default');

export function useData() {
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
      const headers = {
        'X-Tenant-ID': tenantId.value
      };

      const [catsRes, artsRes] = await Promise.all([
        fetch('/api/categories', { headers }),
        fetch('/api/articles', { headers })
      ]);
      
      if (!catsRes.ok || !artsRes.ok) {
        throw new Error(`API error: ${catsRes.status} ${artsRes.status}`);
      }

      const catsData = await catsRes.json();
      const artsData = await artsRes.json();
      
      console.log('Data fetched successfully:', { 
        categoriesCount: catsData.length, 
        articlesCount: artsData.length 
      });
      
      categories.value = catsData;
      articles.value = artsData;
      isInitialized.value = true;
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
    setTenantId,
    fetchData,
    getCategoryName
  };
}
