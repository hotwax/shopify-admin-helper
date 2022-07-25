import { client } from '@/api';

const generateAccessToken = async (config: any): Promise <any>  => {
  return client({
    url: "/generateShopifyAccessToken",
    method: "post",
    ...config
  });
}

const getStores = async (config: any): Promise <any> => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: "storeLookup",
    method: 'post',
    baseURL: baseURL,
    ...config
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
  generateAccessToken
}