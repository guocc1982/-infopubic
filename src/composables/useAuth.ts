import { ref, computed } from 'vue';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
}

const user = ref<User | null>(null);
const token = ref<string | null>(localStorage.getItem('auth_token'));

if (token.value) {
  const savedUser = localStorage.getItem('auth_user');
  if (savedUser) {
    try {
      user.value = JSON.parse(savedUser);
    } catch (e) {
      console.error('Failed to parse saved user', e);
    }
  }
}

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  const login = (newToken: string, newUser: User) => {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    login,
    logout
  };
}
