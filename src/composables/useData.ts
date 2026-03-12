import { ref } from 'vue';
import type { Category, Article } from '../types';

export function useData() {
  const categories = ref<Category[]>([]);
  const articles = ref<Article[]>([]);
  const isLoading = ref(false);

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

  const getCategoryName = (id: number) => {
    return categories.value.find(c => c.id === id)?.name || 'Unknown';
  };

  return {
    categories,
    articles,
    isLoading,
    fetchData,
    getCategoryName
  };
}
