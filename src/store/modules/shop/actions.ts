import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ShopState from './ShopState'
import * as types from './mutation-types'
import { getShopifyConfigId, getStores } from '@/services'
import { hasError } from '@/utils'

const actions: ActionTree<ShopState, RootState> = {
  setShopToken({ commit }, payload) {
    commit(types.SHOP_TOKEN_UPDATED, { token: payload.token })
  },
  setShop({ commit }, payload) {
    commit(types.SHOP_UPDATED, { shop: payload })
  },
  async getStores({commit}, payload){
    let resp;
    try {
      resp = await getStores(payload);
      if(resp.status === 200 && !hasError(resp) && resp.data.response?.docs){
        commit(types.SHOP_STORES_UPDATED, resp.data.response.docs);
        return resp.data.response.docs;
      } else {
        return  
      }
      
    } catch(err){
      console.error(err);
      return 
    }
  },
  async getShopifyConfigId({commit}, payload){
    let resp;
    try {
      resp = await getShopifyConfigId(payload);
      if(resp.status === 200 && !hasError(resp) && resp.data?.docs){
        const shopifyConfigId = resp.data.docs[0].shopifyConfigId
        commit(types.SHOP_CONFIG_ID_UPDATED, shopifyConfigId);
        return shopifyConfigId;
      } else {
        return 
      }
    } catch(err) {
      console.error(err);
      return
    }
  }
}
export default actions;