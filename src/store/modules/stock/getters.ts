import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '@/store/RootState'

const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state) => (sku: string, facilityId: string) => {
    return state.products[sku] ? state.products[sku][facilityId] ? state.products[sku][facilityId] : 0 : 0
  },
  getPreorderItemAvailability: (state) => (productId: string) => {
    return state.preorder[productId] ? state.preorder[productId] : {}
  },
}
export default getters;