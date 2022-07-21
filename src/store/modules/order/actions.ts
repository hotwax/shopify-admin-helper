import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './orderState'
import * as types from './mutation-types'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'

const actions: ActionTree<OrderState, RootState> = {
  async getDraftOrder ({ commit, dispatch }, params) {
    const payload = {
      draftOrderId: params.id,
      shopifyConfigId: params.shopifyConfigId
    }
    try {
      const resp = await OrderService.getDraftOrder(payload);
      if (resp.status === 200 && !hasError(resp) && resp.data.response.draft_order) {
        const productSkus = resp.data.response.draft_order.line_items.map((item: any) => item.sku).filter((sku: any) => sku);
        dispatch('checkInventory', productSkus);
        const order = resp.data.response.draft_order;
        commit(types.DRAFT_ORDER_UPDATED, order);
      } else {
        console.error(resp);
        showToast(translate("Something went wrong"));
      }
    } catch (err) {
      console.error(err);
      showToast(translate("Something went wrong"));
    }
  },

  async updateDraftOrder ({ dispatch }, payload) {
    let resp;
    const params = {
      draftOrderId: payload.id,
      payload: {"draft_order": { "line_items": payload.lineItems }},
      shopifyConfigId: payload.shopifyConfigId
    }
    try {
      resp = await OrderService.updateDraftOrder(params);
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate("Order Updated successfully."));
        await dispatch('getDraftOrder', {id: payload.id, shopifyConfigId: payload.shopifyConfigId});
      } else {
        console.error(resp);
        showToast(translate("Something went wrong"));
      }
    } catch (err) {
      console.error(err);
      showToast(translate("Something went wrong"));
    }
  },

  checkInventory({ commit }, productSkus){
    const stores = this.state.shop.stores;
    if (stores.length > 0) {
      const facilityIds = stores.map((facility: any) => facility.storeCode);
      this.dispatch('stock/checkInventory', { sku: productSkus, facilityId: facilityIds });
    }
  }
}
export default actions;