<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="end" @click="close()">
        <ion-button>
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Select pickup location") }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="searchPriority == 'zipCode' ? $t('Search zip code') : $t('Search')"  v-model="queryString" @keyup.enter="search($event)" />
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <div v-if="isloading" class="empty-state">
      <ion-spinner name="crescent" />
      <p>{{ $t("Fetching stores") }}</p>
    </div>

    <div v-else-if="!nearbyStores.length" class="ion-text-center">
      <p>{{ searchPriority == 'zipCode' ? $t("No stores found. Please search another zip code.") : $t("No stores found. Please search another store.") }}</p>
    </div>

    <ion-list v-else>
      <ion-list-header v-if="searchPriority == 'zipCode'" lines="full" color="light">
        <ion-label>{{ $t("Nearby stores") }}</ion-label>
      </ion-list-header>
      <ion-radio-group v-model="selectedFacility">
        <ion-item v-for="store of nearbyStores" :key="store.facilityId">
          <ion-radio :disabled="!store.isInventoryAvailableForAllProducts" :value="store" slot="start" />
          <ion-label>
            <h2>{{ store.facilityName || store.storeName }}</h2>
            <p v-if="!store.isInventoryAvailableForAllProducts">{{ $t("No inventory") }}</p>
          </ion-label>
          <ion-label v-if="store.distance" slot="end">{{ store.distance }} {{ $t("mi") }}</ion-label>
        </ion-item>
      </ion-radio-group>
    </ion-list>
    <!-- Only show select button if there are stores to select from -->
    <div v-if="nearbyStores.length" class="ion-text-center">
      <ion-button :disabled="Object.keys(selectedFacility).length == 0 || selectedFacility.facilityId == facilityId" @click="updateFacility()">{{ $t("Select pickup location") }}</ion-button>
    </div>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  loadingController,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { useRouter } from "vue-router";
import { mapGetters, useStore } from 'vuex';
import { FacilityService } from '@/services/FacilityService';
import { StockService } from '@/services/StockService';
import { hasError } from '@/utils';
import { UtilityService } from '@/services/UtilityService';

export default defineComponent({
  name: 'PickupLocationModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonListHeader,
    IonLabel,
    IonRadio,
    IonRadioGroup,
    IonSearchbar,
    IonSpinner,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      loader: null as any,
      queryString: '',
      nearbyStores: [] as any,
      selectedFacility: {} as any,
      searchPriority: 'zipCode',
      filters: process.env.VUE_APP_DEFAULT_STORETYPE,
      isloading: false
    }
  },
  props: ["facilityId"],
  computed: {
    ...mapGetters({
      order: 'order/getDraftOrder',
      shop: 'shop/getShop',
      shopifyShopId: 'shop/getShopifyShopId'
    })
  },
  async mounted() {
    this.isloading = true
    const shopifyShops = JSON.parse(process.env.VUE_APP_DEFAULT_SHOP_CONFIG)
    const shopConfiguration = shopifyShops[this.shop]

    if(shopConfiguration) {
      this.searchPriority = shopConfiguration.search

      const filterByBrand = JSON.parse(process.env.VUE_APP_SHOPIFY_SHOP_CONFIG)[this.shop]?.filterByBrand

      if(filterByBrand && filterByBrand === "true") {
        await this.store.dispatch('shop/getShopifyShopId', this.shop);
        // Accessing 0th index of filter by considering that the filters array will have a single value in the env file
        this.filters = this.shopifyShopId ? [shopConfiguration.filters[0].concat(` AND primaryFacilityGroupId: ${this.shopifyShopId}`)] : shopConfiguration.filters
      } else {
        this.filters = shopConfiguration.filters
      }
    }

    try {
      const stores = await this.getStores("")
      if (!stores?.length) return;

      const facilityIds = stores.map((store: any) => store.storeCode)
      const storesWithInventory = await this.checkInventory(facilityIds)

      stores.map((storeData: any) => {
        const inventoryDetails = Object.keys(storesWithInventory).find((storeCode: any) => {
          const isInventoryAvailableForAllProducts = this.order.line_items.every((item: any) => storesWithInventory[storeCode][item.sku] >= item.quantity)
          return storeCode === storeData.storeCode && isInventoryAvailableForAllProducts
        });
        // only add stores information in array when having inventory for that store
        if(inventoryDetails) {
          this.nearbyStores.push({ ...storeData, isInventoryAvailableForAllProducts: true, distance: storeData.dist });
        } else {
          this.nearbyStores.push({ ...storeData, isInventoryAvailableForAllProducts: false });
        }
      });
      console.log('this.nearbyStores', this.nearbyStores)
    } catch(err) {
      console.error(err)
    } finally {
      this.isloading = false
    }
  },
  methods: {
    async presentLoader() {
      this.loader = await loadingController
        .create({
          message: this.$t("Fetching stores"),
          translucent: true,
        });
      await this.loader.present();
    },

    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null;
      }
    },

    async getStores(location: string) {
      const payload = {
        "viewSize": 10,
        "filters": this.filters,
        "keyword": this.queryString
      } as any

      if(this.searchPriority == 'zipCode') {
        payload['point'] = location
        payload['distance'] = process.env.VUE_APP_DEFAULT_STORELOOKUP_DISTANCE ? process.env.VUE_APP_DEFAULT_STORELOOKUP_DISTANCE : 50
      }

      try {
        const storeLookupResp = await FacilityService.getStores(payload)

        if (!storeLookupResp.data.response?.numFound) return [];
        return storeLookupResp.data.response.docs
      } catch (error) {
        console.error(error)
      }
    },

    async getZipCodeGeoLocation() {
      try {
        const locationResp = await UtilityService.getGeoLocation({
          "json": {
            "query": `postcode: ${this.queryString.startsWith('0') ? `${this.queryString} OR ${this.queryString.substring(1)}` : this.queryString}`
          }
        })

        if (!locationResp.data.response?.numFound) return '';
        return locationResp.data.response.docs[0].location
      } catch (error) {
        console.error(error)
      }
    },
    
    async checkInventory(facilityIds: Array<string>) {
      const productSkus = this.order.line_items.map((item: any) => item.sku);
      try {
        const productInventoryResp = await StockService.checkInventoryByFacility({
          "filters": {
            "sku": productSkus,
            "sku_op": "in",
            "facilityId": facilityIds,
            "facilityId_op": "in"
          },
          "fieldsToSelect": ["atp", "facilityName", "facilityId", "sku"],
          "viewSize": productSkus.length * facilityIds.length
        });

        if (hasError(productInventoryResp) || !productInventoryResp.data.count) return [];

        const inventoryByFacilities = productInventoryResp.data.docs.reduce((inventoryByFacilities: any, facility: any) => {
          if (inventoryByFacilities[facility.facilityId]) {
            facility.atp > 0 && (inventoryByFacilities[facility.facilityId][facility.sku] = facility.atp)
          } else {
            inventoryByFacilities[facility.facilityId] = {
              [facility.sku]: facility.atp
            }
          }

          return inventoryByFacilities;
        }, {})

        console.log('inventoryByFacilities', inventoryByFacilities);

        return inventoryByFacilities;
      } catch (error) {
        console.error(error)
      }
    },

    async search(event: any) {
      this.queryString = event.target.value.trim();
      if(!this.queryString) return 
      this.nearbyStores = [];
      this.isloading = true;
      try {
        let location = ''

        // if the shop supports zipCode search then only fetch the geoLocation
        if(this.searchPriority == 'zipCode') {
          location = await this.getZipCodeGeoLocation()
          if (!location) return;
        }

        const stores = await this.getStores(location)
        if (!stores?.length) return;

        const facilityIds = stores.map((store: any) => store.storeCode)
        const storesWithInventory = await this.checkInventory(facilityIds)

        stores.map((storeData: any) => {
          const inventoryDetails = Object.keys(storesWithInventory).find((storeCode: any) => {
            const isInventoryAvailableForAllProducts = this.order.line_items.every((item: any) => storesWithInventory[storeCode][item.sku] >= item.quantity)
            return storeCode === storeData.storeCode && isInventoryAvailableForAllProducts
          });
          // only add stores information in array when having inventory for that store
          if(inventoryDetails) {
            this.nearbyStores.push({ ...storeData, isInventoryAvailableForAllProducts: true, distance: storeData.dist });
          } else {
            this.nearbyStores.push({ ...storeData, isInventoryAvailableForAllProducts: false });
          }
        });
      } catch (error) {
        console.error(error)
      } finally {
        this.isloading = false
      }
    },

    updateFacility() {
      const facilityData = {
        selectedFacility: [this.selectedFacility.storeName, this.selectedFacility.address1, this.selectedFacility.city].slice().join(', '),
        storeCode: this.selectedFacility.storeCode
      }
      this.close(facilityData);
    },

    close(facilityData?: any) {
      modalController.dismiss({ dismissed: true }, facilityData);
    },

    async selectSearchBarText(event: any) {
      const element = await event.target.getInputElement()
      element.select();
    },
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    return { closeOutline, router, store };
  }
});
</script>