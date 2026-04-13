import { useAuth } from './useAuth';

export function useApi() {
  const { token, logout } = useAuth();

  const apiFetch = async (url: string, options: RequestInit = {}, retries = 2) => {
    const headers = new Headers(options.headers || {});
    
    if (token.value) {
      headers.set('Authorization', `Bearer ${token.value}`);
    }
    
    const tenantId = localStorage.getItem('tenantId') || 'default';
    headers.set('X-Tenant-ID', tenantId);

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        logout();
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }

      return response;
    } catch (error) {
      if (retries > 0 && (error instanceof Error && error.message === 'Failed to fetch')) {
        console.warn(`Fetch failed, retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return apiFetch(url, options, retries - 1);
      }
      throw error;
    }
  };

  return {
    apiFetch
  };
}
