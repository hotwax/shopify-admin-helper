import { MutationTree } from 'vuex'
import StockState from './StockState'
import * as types from './mutation-types'

const mutations: MutationTree <StockState> = {
  [types.STOCK_PRODUCTS_UPDATED] (state, payload) {
    payload.forEach((product: any) => {
      if (product.sku) {
        state.products[product.sku] ? state.products[product.sku][product.facilityId] = product.atp : state.products = { ...state.products, [product.sku]: { [product.facilityId]: product.atp }}
      }
    });
  },
  [types.STOCK_ITEM_AVAILABILITY_UPDATED] (state, payload) {
    payload.forEach((product: any) => {
      state.preorderItemAvailability[product.sku] = { ...product }
    });
  }
}
export default mutations;