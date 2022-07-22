import api, { client } from '@/api'
import store from '@/store';

const generateAccessToken = async (config: any): Promise <any>  => {
  return client({
    url: "/generateShopifyAccessToken",
    method: "post",
    ...config
  });
}

const getStores = async (payload: any): Promise <any> => {
  return api({
    url: "storeLookup",
    method: 'post',
    data: payload
  })
}

const getShopifyConfigId = async (payload: any): Promise <any> => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: "performFind",
    method: "post",
    baseURL: baseURL,
    ...payload
  });
}

export {
  generateAccessToken,
  getShopifyConfigId,
  getStores
}