import api from '@/api'

const checkInventoryByFacility = async (query: any): Promise <any> => {
  return api({
    url: "checkInventory", 
    method: "post",
    data: query
  });
}

const checkPreorderItemAvailability = async (payload: any): Promise <any>  => {
  return api({
    url: "checkPreorderItemAvailability",
    method: "get",
    params: payload
  });
}

export const StockService = {
  checkInventoryByFacility,
  checkPreorderItemAvailability
}