import { GetterTree } from 'vuex'
import ShopState from './ShopState'
import RootState from '@/store/RootState'

const getters: GetterTree <ShopState, RootState> = {
  getShopToken (state) {
    return state.token
  },
  getShop (state) {
    return state.shop;
  },
  getShopConfigId (state) {
    return state.configId;
  },
  getStores (state) {
    return state.stores;
  },
  getRouteParams (state) {
    return state.routeParams;
  }
}
export default getters;