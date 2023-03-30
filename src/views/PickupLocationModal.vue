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
          <ion-label slot="end">{{ store.distance }} {{ $t("mi") }}</ion-label>
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
      selectedFacility: {} as any
    }
  },
  props: ["item", "facilityId"],
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

    async getStores(location: string) {
      const payload = {
        "viewSize": 50,
        "filters": process.env.VUE_APP_DEFAULT_STORETYPE,
        "keyword": this.queryString,
        "point": location,
        "distance": process.env.VUE_APP_DEFAULT_STORELOOKUP_DISTANCE ? process.env.VUE_APP_DEFAULT_STORELOOKUP_DISTANCE : 50
      } as any

      try {
        const storeLookupResp = await FacilityService.getStores(payload)

        if (!storeLookupResp.data.response.numFound) return [];
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

        if (!locationResp.response) return '';
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
        const location = await this.getZipCodeGeoLocation()
        if (!location) return;
        const stores = await this.getStores(location)
        if (!stores?.length) return;

        const facilityIds = stores.map((store: any) => store.storeCode)
        const storesWithInventory = await this.checkInventory(facilityIds)
        if (!storesWithInventory?.length) return;

        stores.map((storeData: any) => {
          const inventoryDetails = storesWithInventory.find((store: any) => store.facilityId === storeData.storeCode);
          this.nearbyStores.push({ ...storeData, ...inventoryDetails, distance: storeData.dist });
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