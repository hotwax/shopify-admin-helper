import api from '@/api';

const getGeoLocation = async (payload: any): Promise <any>  => {
  return api({
    url: "postcodeLookup", 
    method: "post",
    data: payload,
  });
}

const getShopifyShop = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "post",
    data: payload,
  });
}

export const UtilityService = {
  getGeoLocation,
  getShopifyShop
}