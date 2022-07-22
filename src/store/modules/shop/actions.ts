import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ShopState from './ShopState'
import * as types from './mutation-types'
import { getStores } from "@/services"
import { hasError } from '@/utils'

const actions: ActionTree<ShopState, RootState> = {
  setShopToken({ commit }, payload) {
    commit(types.SHOP_TOKEN_UPDATED, { token: payload.token })
  },
  setShop({ commit }, payload) {
    commit(types.SHOP_UPDATED, { shop: payload })
  },
  async getStores({commit}) {
    let resp;
    const payload = {
      //Increased the viewSize as we have not implemented infinite scroll, will use the default when UI is updated.
      "viewSize": 50
    }

    try {
      resp = await getStores(payload);
      if(resp.status === 200 && !hasError(resp) && resp.data.response?.docs){
        commit(types.SHOP_STORES_UPDATED, resp.data.response.docs);
      } else {
        console.error(resp);
      }
    } catch(err) {
      console.error(err);
    }
  }
}
export default actions;