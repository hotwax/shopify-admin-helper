import { StockService }  from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/utils'

const actions: ActionTree<StockState, RootState> = {
  async checkInventoryByFacility({commit}, productSkus) {
    const stores = this.state.shop.stores;
    if (stores.length > 0) {
      let resp;
      const facilityIds = stores.map((facility: any) => facility.storeCode);
      const payload = {
        "viewSize": productSkus.length * facilityIds.length,
        "filters":{
          "facilityId": facilityIds,
          "sku": productSkus
        },
        "fieldsToSelect": ["sku", "atp", "facilityId"],
      }
  
      try {
        resp = await StockService.checkInventoryByFacility(payload);
        if(resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0){
          commit(types.STOCK_PRDCTS_BY_FACLTY_UPDATED, resp.data.docs)
        }
      } catch (err) {
        console.error(err);
      }
    }
  },
  async checkPreorderItemAvailability ({ commit, state }, productIds) {
    let resp;
    const cachedProductIds = Object.keys(state.preorder);
    const productIdFilter= productIds.reduce((filter: any, productId: any) => {
      // If product already exist in cached products skip
      if (!cachedProductIds.includes(productId)) {
        filter.push(productId);
      }
      return filter;
    }, []);
    if(productIdFilter.length > 0){
      const payload = {
        "viewSize": productIdFilter.length,
        "filters": {
          "sku": productIdFilter,
          "sku_op": "in"
        }
      }
      try {
        resp = await StockService.checkPreorderItemAvailability(payload);
        if (resp.status === 200 && !hasError(resp) && resp.data?.docs) {
          commit(types.STOCK_PREODR_AVLBLTY_UPDATED, resp.data.docs)
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
}
export default actions;