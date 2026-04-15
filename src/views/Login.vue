<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ t('login.title') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ t('login.desc') }}
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="username" class="sr-only">{{ t('login.username') }}</label>
            <input
              id="username"
              v-model="username"
              name="username"
              type="text"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              :placeholder="t('login.username')"
            />
          </div>
          <div>
            <label for="password" class="sr-only">{{ t('login.password') }}</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              :placeholder="t('login.password')"
            />
          </div>
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            :style="{ backgroundColor: systemSettings.primary_color }"
          >
            <span v-if="loading">{{ t('login.loggingIn') }}</span>
            <span v-else>{{ t('login.login') }}</span>
          </button>
        </div>
      </form>
      
      <div class="mt-4 text-center text-xs text-gray-500">
        {{ t('login.testAccount') }}: admin / password123
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { login } = useAuth();

// Inject system settings from App.vue
const systemSettings = inject('systemSettings', ref({ primary_color: '#4f46e5' }));

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'default'
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || t('login.loginFailed'));
    }
    
    login(data.token, data.user);
    
    const redirectPath = (route.query.redirect as string) || '/';
    router.push(redirectPath);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>
