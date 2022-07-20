import { StockService }  from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/utils'

const actions: ActionTree<StockState, RootState> = {
  async checkInventory({commit}, params) {
    let resp;
    const payload = {
      "viewSize": params.productId?.length,
      "filters":{
        "facilityId": params.facilityId,
        "sku": params.sku
      } 
    }

    try {
      resp = await StockService.checkInventory(payload);
      if(resp.status == 200 && !hasError(resp) && resp.data.docs?.length > 0){
        commit(types.STOCK_PRODUCTS_UPDATED, resp.data.docs)
      }
    } catch (err) {
      console.error(err);
    }
  },
  async checkPreorderItemAvailability ({commit}, productIds) {
    let resp;
    const payload = {
      "viewIndex": 0,
      "viewSize": productIds.length,
      "filters": {
        "sku": productIds,
        "sku_op": "in"
      }
    }
    try {
      resp = await StockService.checkPreorderItemAvailability(payload);
      if (resp.status == 200 && !hasError(resp) && resp.data?.docs) {
        return resp.data.docs
      } else {
        return [];
      }
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}
export default actions;