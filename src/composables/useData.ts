import { ref } from 'vue';
import type { Category, Article } from '../types';

const categories = ref<Category[]>([]);
const articles = ref<Article[]>([]);
const isLoading = ref(false);
const isInitialized = ref(false);

export function useData() {
  const fetchData = async (force = false) => {
    if (isInitialized.value && !force) return;
    
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
    return cat ? cat.name : 'Unknown1';
  };

  const getSubCategoryIds = (parentId: number): number[] => {
    const subs = categories.value.filter(c => c.parent_id === parentId);
    let ids = subs.map(c => c.id);
    subs.forEach(s => {
      ids = [...ids, ...getSubCategoryIds(s.id)];
    });
    return ids;
  };

  return {
    categories,
    articles,
    isLoading,
    isInitialized,
    fetchData,
    getCategoryName,
    getSubCategoryIds
  };
}
