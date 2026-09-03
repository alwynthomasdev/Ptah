import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/board' },
  {
    path: '/board',
    name: 'board',
    component: () => import('../views/SwimlaneView.vue'),
  },
  { path: '/list', name: 'list', component: () => import('../views/ListView.vue') },
  {
    path: '/backlog',
    name: 'backlog',
    component: () => import('../views/BacklogView.vue'),
  },
  {
    path: '/archive',
    name: 'archive',
    component: () => import('../views/ArchiveView.vue'),
  },
  {
    path: '/bin',
    name: 'bin',
    component: () => import('../views/RecycleBinView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
