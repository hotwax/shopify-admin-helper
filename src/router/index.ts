import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Install from '@/views/Install.vue'
import Settings from "@/views/Settings.vue"
import Login from '@/views/Login.vue'
import store from '@/store'
import Home from '@/views/Home.vue'
import OrderDetail from '@/views/OrderDetail.vue'

const authGuard = (to: any, from: any, next: any) => {
  const existingShop = store.getters['shop/getShop']
  const currentShop = to.query.shop;
  //The app is used for multiple shopes. This snippet of code handles the case when existing shop is different from the one we access from URL.
  const isShopMismatch = from.path === "/" && !(from.path === "/" && !existingShop || (existingShop && currentShop === existingShop));
  // TODO Find a better way
  if (from.path === "/" && currentShop) {
    store.dispatch('shop/setShop', currentShop);
  }
  if (store.getters['user/isAuthenticated'] && !isShopMismatch) {
    next()
  } else {
    store.dispatch('user/logout');
    next("/login")
  }
};

const loginGuard = (to: any, from: any, next: any) => {
  if (!store.getters['user/isAuthenticated']) {
    next()
  } else {
    next("/")
  }
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/install',
    name: 'Install',
    component: Install
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: loginGuard
  },
  {
    path: '/',
    redirect: '/install'
  },
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/order-detail',
    name: 'OrderDetail',
    component: OrderDetail,
    beforeEnter: authGuard
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
