import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '@/store/RootState'

const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state) => (sku: string, facilityId: string) => {
    return state.productsByFacility[sku] ? state.productsByFacility[sku][facilityId] ? state.productsByFacility[sku][facilityId] : 0 : 0
  },
  getPreorderItemAvailability: (state) => (productId: string) => {
    return state.preorder[productId] ? state.preorder[productId] : {}
  },
}
export default getters;