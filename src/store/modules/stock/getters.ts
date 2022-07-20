import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '@/store/RootState'

const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state) => (productId: string) => {
    return state.products[productId] ? state.products[productId] : 0
  },
  getPreorderItemAvailability: (state) => (productId: string) => {
    return state.preorderItemAvailability[productId] ? state.preorderItemAvailability[productId] : {}
  },
}
export default getters;