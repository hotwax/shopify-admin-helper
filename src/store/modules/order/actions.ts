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
      payload.item.properties = payload.item.properties.filter((property: any) => !(property.name === '_pickupstore' || property.name === 'Pickup Store'))
    } else {
      const store = this.state.shop.stores[0];
      let address = [store.storename, store.address1, store.city].filter((value: any) => value).join(", ");
      payload.item.properties.push({ name: '_pickupstore', value: store.storeCode }, { name: 'Pickup Store', value: address })
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