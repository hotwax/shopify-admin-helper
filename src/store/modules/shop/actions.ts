import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ShopState from './ShopState'
import * as types from './mutation-types'
import { getShopifyConfigId, getStores } from '@/services'
import { hasError } from '@/utils'
import { UtilityService } from '@/services/UtilityService'

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
      if(resp.status === 200 && !hasError(resp) && resp.data.response?.docs?.length > 0){
        commit(types.SHOP_STORES_UPDATED, resp.data.response.docs);
        return resp.data.response.docs;
      } else {
        return  [];
      }
      
    } catch(err){
      console.error(err);
      return [];
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
        return "";
      }
    } catch(err) {
      console.error(err);
      return "";
    }
  },
  setRouteParams({commit}, payload){
    commit(types.SHOP_ROUTE_PARAMS_UPDATED, payload)
  },
  async getShopifyShopId({ commit, state }, shop) {
    let shopId = "";

    // If we do not get value for shop in the argument or if we already have shopifyShopId in state
    // then do not do anything and just break the flow
    if(!shop || state.shopifyShopId) {
      return;
    }

    const payload = {
      "inputFields": {
        "myshopifyDomain": shop
      },
      "entityName": "ShopifyShop",
      "noConditionFind": "Y",
      "fieldList": ["shopifyShopId", "myshopifyDomain"],
      "viewSize": 1
    }

    try {
      const resp = await UtilityService.getShopifyShop(payload)

      if(!hasError(resp) && resp.data?.docs.length > 0) {
        shopId = resp.data.docs[0].shopifyShopId
      }
    } catch(err) {
      console.error("Shopify shop id not found")
    }

    commit(types.SHOP_SHOPIFY_ID_UPDATED, shopId)
  }
}
export default actions;