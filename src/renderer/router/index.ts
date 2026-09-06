import { createRouter, createWebHashHistory } from 'vue-router';
import QuickAddWindow from '../views/QuickAddWindow.vue';
import QuickNoteWindow from '../views/QuickNoteWindow.vue';

const routes = [
  { path: '/', redirect: '/board' },
  // Static imports (not lazy) so `route.name` resolves synchronously before
  // App.vue mounts — it branches the whole shell on this.
  { path: '/quick-add', name: 'quick-add', component: QuickAddWindow },
  { path: '/quick-note', name: 'quick-note', component: QuickNoteWindow },
  {
    path: '/today',
    name: 'today',
    component: () => import('../views/TodayView.vue'),
  },
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
    path: '/search',
    name: 'search',
    component: () => import('../views/SearchView.vue'),
  },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('../views/NotesListView.vue'),
  },
  {
    path: '/note/:id',
    name: 'note',
    component: () => import('../views/NoteView.vue'),
  },
  {
    path: '/ticket/:id',
    name: 'ticket',
    component: () => import('../views/TicketView.vue'),
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
