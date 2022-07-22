import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './orderState'
import * as types from './mutation-types'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import { DateTime } from 'luxon'

const actions: ActionTree<OrderState, RootState> = {
  async getDraftOrder ({ commit, dispatch }, orderId) {
    const payload = {
      draftOrderId: orderId,
      shopifyConfigId: this.state.shop.configId
    }
    try {
      const resp = await OrderService.getDraftOrder(payload);
      if (resp.status === 200 && !hasError(resp) && resp.data.response?.draft_order) {
        const order = resp.data.response.draft_order;
        const productSkus = order.line_items.map((item: any) => item.sku).filter((sku: any) => sku);
        this.dispatch('stock/checkInventoryByFacility', productSkus);
        this.dispatch('stock/checkPreorderItemAvailability', productSkus);
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

  async updateDraftOrder ({ dispatch }, order) {
    let resp;
    const params = {
      draftOrderId: order.id,
      payload: {"draft_order": { "line_items": order.line_items }},
      shopifyConfigId: this.state.shop.configId
    }
    try {
      resp = await OrderService.updateDraftOrder(params);
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate("Order Updated successfully."));
        await dispatch('getDraftOrder', { id: order.id, shopifyConfigId: this.state.shop.configId });
      } else {
        console.error(resp);
        showToast(translate("Something went wrong"));
      }
    } catch (err) {
      console.error(err);
      showToast(translate("Something went wrong"));
    }
  },
  markBopisItem({ commit }, payload){
    if(payload.isBopis){
      payload.item.properties.splice(payload.item.properties.indexOf((property: any) => property.name === '_pickupstore'), 1)
      payload.item.properties.splice(payload.item.properties.indexOf((property: any) => property.name === 'Pickup Store'), 1)
    } else {
      const address = `${this.state.shop.stores[0].storeName}, ${this.state.shop.stores[0].address1}, ${this.state.shop.stores[0].city}`
      payload.item.properties.push({ name: '_pickupstore', value: this.state.shop.stores[0].storeCode }, { name: 'Pickup Store', value: address })
    }
  },
  markPreorderBackorderItem({ commit }, payload){
    const product = this.state.stock.getPreorderItemAvailability(payload.item.sku)
    if(product){
      payload.item.properties.push({ name: 'Note', value: payload.value }, { name: 'PROMISE_DATE', value: DateTime.fromISO(product.estimatedDeliveryDate).toFormat("MM/dd/yyyy") })
    }
  }
}
export default actions;