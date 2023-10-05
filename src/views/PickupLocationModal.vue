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
    <div v-if="!queryString.length" class="ion-text-center">
      <p>{{ searchPriority == 'zipCode' ? $t("Enter zip code to search stores nearby") : $t('Enter keyword to search stores') }}</p>
    </div>    

    <div v-else-if="!nearbyStores.length" class="ion-text-center">
      <p>{{ searchPriority == 'zipCode' ? $t("No stores found. Please search another zip code.") : $t("No stores found. Please search another store.") }}</p>
    </div>

    <ion-list v-else >
      <ion-list-header v-if="searchPriority == 'zipCode'" lines="full" color="light">
        <ion-label>{{ $t("Nearby stores") }}</ion-label>
      </ion-list-header>
      <ion-radio-group v-model="selectedFacility">
        <ion-item v-for="store of nearbyStores" :key="store.facilityId">
          <ion-radio :value="store" slot="start" />
          <ion-label>
            <h2>{{ store.facilityName }}</h2>
            <p>{{ store.atp }} {{ $t("in stock") }}</p>
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
      filters: process.env.VUE_APP_DEFAULT_STORETYPE
    }
  },
  props: ["item", "facilityId"],
  computed: {
    ...mapGetters({
      order: 'order/getDraftOrder',
      shop: 'shop/getShop'
    })
  },
  mounted() {
    const shopifyShops = JSON.parse(process.env.VUE_APP_DEFAULT_SHOP_CONFIG)
    const shopConfiguration = shopifyShops[this.shop]

    if(shopConfiguration) {
      this.searchPriority = shopConfiguration.search
      this.filters = shopConfiguration.filters
    }
  },
  methods: {
    async presentLoader() {
      this.loader = await loadingController
        .create({
          message: this.$t("Fetching stores."),
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
        "viewSize": 50,
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
            "query": `postcode:${this.queryString}`
          }
        })

        if (!locationResp.data.response?.numFound) return '';
        return locationResp.data.response.docs[0].location
      } catch (error) {
        console.error(error)
      }
    },
    
    async checkInventory(facilityIds: Array<string>) {
      try {
        const productInventoryResp = await StockService.checkInventoryByFacility({
          "filters": {
            "sku": this.item.sku,
            "facilityId": facilityIds
          },
          "fieldsToSelect": ["atp", "facilityName", "facilityId"],
        });

        if (hasError(productInventoryResp) || !productInventoryResp.data.count) return [];
        return productInventoryResp.data.docs.filter((store: any) => store.atp > 0)
      } catch (error) {
        console.error(error)
      }
    },

    async search(event: any) {
      this.queryString = event.target.value.trim();
      if(!this.queryString) return 
      this.nearbyStores = [];
      await this.presentLoader()
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
        if (!storesWithInventory?.length) return;

        stores.map((storeData: any) => {
          const inventoryDetails = storesWithInventory.find((store: any) => store.facilityId === storeData.storeCode);
          // only add stores information in array when having inventory for that store
          if(inventoryDetails) {
            this.nearbyStores.push({ ...storeData, ...inventoryDetails, distance: storeData.dist });
          }
        });
      } catch (error) {
        console.error(error)
      } finally {
        this.dismissLoader()
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