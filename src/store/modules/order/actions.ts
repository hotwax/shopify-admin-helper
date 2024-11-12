import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './orderState'
import * as types from './mutation-types'
import { OrderService } from '@/services/OrderService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'

const actions: ActionTree<OrderState, RootState> = {
  async getDraftOrder ({ commit }, orderId) {
    const payload = {
      draftOrderId: orderId,
      shopifyConfigId: this.state.shop.configId
    }
    try {
      const resp = await OrderService.getDraftOrder(payload);
      if (resp.status === 200 && !hasError(resp) && resp.data.response?.draft_order) {
        const order = resp.data.response.draft_order;

        // If all the items are bopis items, then only consider the order as bopis
        const isBopisOrder = order.line_items.every((item: any) => item.properties.some((property: any) => property.name === "_pickupstore"))
        if(isBopisOrder) {
          order.selectedFacility = order.line_items[0].properties.find((property: any) => property.name == 'Store Pickup').value
          order.selectedFacilityId = order.line_items[0].properties.find((property: any) => property.name == '_pickupstore').value
        } else {
          order.selectedFacility = ""
          order.selectedFacilityId = ""
        }
        commit(types.DRAFT_ORDER_UPDATED, order);
      } else {
        console.error(resp);
      }
    } catch (err) {
      console.error(err);
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