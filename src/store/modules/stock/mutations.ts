import { MutationTree } from 'vuex'
import StockState from './StockState'
import * as types from './mutation-types'

const mutations: MutationTree <StockState> = {
  [types.STOCK_PRDCTS_BY_FACLTY_UPDATED] (state, payload) {
    payload.forEach((product: any) => {
      state.products[product.sku] ? state.products[product.sku][product.facilityId] = product.atp : state.products = { ...state.products, [product.sku]: { [product.facilityId]: product.atp }}
    });
  },
  [types.STOCK_PREODR_AVLBLTY_UPDATED] (state, payload) {
    payload.forEach((product: any) => {
      state.preorder[product.sku] = { ...product }
    });
  }
}
export default mutations;