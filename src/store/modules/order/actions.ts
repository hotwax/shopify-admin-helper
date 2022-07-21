import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './orderState'
import * as types from './mutation-types'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import { DateTime } from 'luxon'

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
        this.dispatch('stock/checkInventory', productSkus);
        this.dispatch('stock/checkPreorderItemAvailability', productSkus);
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
  markBopisItem({commit}, item){
    const address = `${this.state.shop.stores[0].storeName}, ${this.state.shop.stores[0].address1}, ${this.state.shop.stores[0].city}`
    item.properties.push({ name: '_pickupstore', value: this.state.shop.stores[0].storeCode }, { name: 'Pickup Store', value: address })
  },
  markPreorderBackorderItem({commit}, payload){
    const product = this.state.stock.getPreorderItemAvailability(payload.item.sku)
    if(product){
      payload.item.properties.push({ name: 'Note', value: payload.value }, { name: 'PROMISE_DATE', value: DateTime.fromISO(product.estimatedDeliveryDate).toFormat("MM/dd/yyyy") })
    }
  }
}
export default actions;