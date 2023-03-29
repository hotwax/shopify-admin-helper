import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './orderState'
import * as types from './mutation-types'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'

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
        order.line_items.map((item: any) => {
          item.isBopis = item.properties.some((property: any) => property.name === "_pickupstore");
          if (item.isBopis) {
            item.deliveryMethodTypeId = 'STOREPICKUP'
            const facilityAddress = item.properties.find((property: any) => property.name == 'Store Pickup').value.split(', ')
            item.selectedFacility = { facilityName: facilityAddress[0], address1: facilityAddress[1], city: facilityAddress[2] }
          } else {
            item.deliveryMethodTypeId = 'STANDARD'
          }
        })
        dispatch('stock/checkInventoryByFacility', productSkus, { root: true });
        dispatch('stock/checkPreorderItemAvailability', productSkus, { root: true });
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
        return resp;
      } else {
        console.error(resp);
        showToast(translate("Something went wrong"));
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }
    } catch (err: any) {
      console.error(err);
      showToast(translate("Something went wrong"));
      return Promise.reject(new Error(err))
    }
  },
  updateLineItems({ commit }, order){
    commit(types.DRAFT_ORDER_UPDATED, order);
  }
}
export default actions;