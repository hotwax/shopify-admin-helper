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
      <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="$t('Search zip code')"  v-model="queryString" @keyup.enter="search($event)" />
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <div v-if="!queryString.length" class="ion-text-center">
      <p>{{ $t("Enter zip code to search stores nearby") }}</p>
    </div>    

    <div v-else-if="!nearbyStores.length" class="ion-text-center">
      <p>{{ $t("No stores found. Please search another zip code.") }}</p>
    </div>

    <ion-list v-else >
      <ion-list-header lines="full" color="light">
        <ion-label>{{ $t("Nearby stores") }}</ion-label>
      </ion-list-header>
      <ion-radio-group v-model="selectedFacility">
        <ion-item v-for="store of nearbyStores" :key="store.facilityId">
          <ion-radio :value="store" slot="start" />
          <ion-label>
            <h2>{{ store.facilityName }}</h2>
            <p>{{ store.atp }} {{ $t("in stock") }}</p>
          </ion-label>
        </ion-item>
      </ion-radio-group>
    </ion-list>
    <!-- Only show select button if there are stores to select from -->
    <div v-if="nearbyStores.length" class="ion-text-center">
      <ion-button :disabled="Object.keys(selectedFacility).length == 0 || selectedFacility.facilityId == item.properties.find((property: any) => property.name == '_pickupstore')?.value" @click="updateFacility()">{{ $t("Select pickup location") }}</ion-button>
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
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      loader: null as any,
      queryString: '',
      nearbyStores: [] as any,
      facilityId: '',
      selectedFacility: {} as any
    }
  },
  props: ["item"],
  computed: {
    ...mapGetters({
      order: 'order/getDraftOrder',
    })
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

    async search(event: any) {
      this.queryString = event.target.value.trim();
      if(this.queryString) {
        await this.presentLoader()
        this.getPickupStores();
        this.dismissLoader()
      }
    },

    async getStores(location: string) {
      const payload = {
        "viewSize": 50,
        "filters": ["storeType: WAREHOUSE"],
        "keyword": this.queryString,
        "point": location,
        "distance": process.env.VUE_APP_DEFAULT_STORELOOKUP_DISTANCE ? process.env.VUE_APP_DEFAULT_STORELOOKUP_DISTANCE : 50
      } as any

      try {
        const storeLookupResp = await FacilityService.getStores(payload)
        if (storeLookupResp.status !== 200 || hasError(storeLookupResp) || !storeLookupResp.data.response.numFound) {
          return [];
        } 
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

        if (locationResp.status !== 200 || hasError(locationResp) || !locationResp.data.response.numFound) {
          return '';
        }
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

        if (hasError(productInventoryResp) || !productInventoryResp.data.count) {
          return [];
        }
        return productInventoryResp.data.docs.filter((store: any) => store.atp > 0)
      } catch (error) {
        console.error(error)
      }
    },

    async getPickupStores() {
      this.nearbyStores = [];
      try {
        const location = await this.getZipCodeGeoLocation()
        if (!location) return;
        const stores = await this.getStores(location)
        if (!stores?.length) return;

        const facilityIds = stores.map((store: any) => store.storeCode)
        const storesWithInventory = await this.checkInventory(facilityIds)
        if (!storesWithInventory?.length) return;

        stores.map((storeData: any) => {
          const inventoryDetails = storesWithInventory.filter((store: any) => store.facilityId === storeData.storeCode);
          this.nearbyStores.push({ ...storeData, ...inventoryDetails[0] });
        });
      } catch (error) {
        console.error(error)
      }
    },

    updateFacility() {
      this.close(this.selectedFacility);
    },

    close(selectedFacility?: any) {
      modalController.dismiss({ dismissed: true }, selectedFacility);
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