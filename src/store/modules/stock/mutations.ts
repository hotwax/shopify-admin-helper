import { MutationTree } from 'vuex'
import StockState from './StockState'
import * as types from './mutation-types'

const mutations: MutationTree <StockState> = {
  [types.STOCK_PRDCTS_BY_FACLTY_BLK_UPDATED] (state, payload) {
    payload.forEach((product: any) => {
      state.productsByFacility[product.sku] ? state.productsByFacility[product.sku][product.facilityId] = product.atp : state.productsByFacility = { ...state.productsByFacility, [product.sku]: { [product.facilityId]: product.atp }}
    });
  },
  [types.STOCK_PREODR_AVLBLTY_BLK_UPDATED] (state, payload) {
    payload.forEach((product: any) => {
      state.preorder[product.sku] = product;
    });
  }
}
export default mutations;