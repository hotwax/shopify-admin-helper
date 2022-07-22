<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Order Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div>
        <h1 class="center-align">{{ $t("Order") }} {{ order.name }}</h1>
        <ion-card>
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h2>{{ order.customer?.first_name }} {{ order.customer?.last_name }}</h2>
                <!-- TODO: Uncomment this when we'll get CRS information -->
                <!-- <p>CSR name</p> -->
              </ion-label>
              <ion-note slot="end">{{ timeFromNow(order?.created_at) }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card>
    
        <main v-for="item in order.line_items" :key="item.id">
          <ion-card>
            <ion-item lines="none">
              <ion-label>
                <h2>{{ item.title }}</h2>
                <p>{{ item.variant_title }}</p>
                <p class="ion-text-wrap">{{ $t("SKU") }}: {{ item.sku }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-checkbox :checked="isBopisItem(item)" slot="start" @ionChange="markBopisItem(item, $event)" />
              <ion-label>{{ $t("Pickup") }}</ion-label>
              <ion-note slot="end">{{ getProductStock(item.sku, shopifyStore[0]?.storeCode) }} {{ $t("in stock") }}</ion-note>
            </ion-item>
            <ion-radio-group :value="isPreorderBackorderItem(item)" @ionChange="markPreorderBackorderItem(item, $event)">
              <ion-item class="border-top">
                <ion-radio :disabled="checkPreOrderAvailability(item, 'PRE-ORDER')" slot="start" value="Pre Order" />
                <ion-label>{{ $t("Pre Order") }}</ion-label>
                <ion-note slot="end" :color="isPreorderBackorderItem(item) || getEstimatedDeliveryDate(item, 'PRE-ORDER') ? '' : 'warning'">{{ getEstimatedDeliveryDate(item, "PRE-ORDER") ? getEstimatedDeliveryDate(item, "PRE-ORDER") : $t("No shipping estimates") }}</ion-note>
              </ion-item>
              <ion-item class="border-top">
                <ion-radio :disabled="checkPreOrderAvailability(item, 'BACKORDER')" slot="start" value="Back Order" />
                <ion-label >{{ $t("Back Order") }}</ion-label>
                <ion-note slot="end" :color="isPreorderBackorderItem(item) || getEstimatedDeliveryDate(item, 'BACKORDER') ? '' : 'warning'">{{ getEstimatedDeliveryDate(item, "BACKORDER") ? getEstimatedDeliveryDate(item, "PRE-ORDER") : $t("No shipping estimates") }}</ion-note>
              </ion-item>
            </ion-radio-group>
          </ion-card>
        </main>
        <div class="text-center center-align">
          <ion-button @click="updateDraftOrder(order.line_items)">{{ $t("Save changes to order") }}</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>
<script lang="ts">
import {
  IonButton,
  IonCard,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonRadio,
  IonRadioGroup
} from "@ionic/vue";
import {
  sendOutline,
  swapVerticalOutline,
  callOutline,
  mailOutline,
} from "ionicons/icons";
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon';

export default defineComponent({
  name: 'Home',
  components: {
    IonButton,
    IonCard,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonPage,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonRadio,
    IonRadioGroup
  },
  computed: {
    ...mapGetters({
      order: 'order/getDraftOrder',
      shopifyConfigId: 'shop/getShopConfigId',
      shopifyStore: 'shop/getStores',
      getProductStock: 'stock/getProductStock',
      getPreorderItemAvailability: 'stock/getPreorderItemAvailability'
    })
  },

  async mounted(){
    if (this.$route.query.id) {
      await this.store.dispatch('order/getDraftOrder', {id: this.$route.query.id, shopifyConfigId: this.shopifyConfigId });
    }
  },
  methods: {
    isBopisItem(item: any){
      return item.properties.some((property: any) => property.name === "Pickup Store");
    },
    checkPreOrderAvailability(item: any, label: string){
      const product = this.getPreorderItemAvailability(item.sku);  
      return !(product.label === label);
    },
    markBopisItem (item: any, event: any) {
      if(event.detail.checked){
        this.store.dispatch('order/markBopisItem', item);
      }
    },
    markPreorderBackorderItem (item: any, event: any) {
      if(event.detail.value === "Pre Order" || event.detail.value === "Back Order"){
        this.store.dispatch('order/markPreorderBackorderItem', { item, value: event.detail.value });
      }
    },
    updateDraftOrder (lineItems: any) {
      const id = this.order.id;
      this.store.dispatch('order/updateDraftOrder', {lineItems, id, shopifyConfigId: this.shopifyConfigId});
    },
    isPreorderBackorderItem (item: any) {
      const property = item.properties?.find((property: any) => property.name === 'Note')?.value;
      return property ?  property :  "None";
    },
    timeFromNow (time: string) {
      if (time) {
        const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
        return DateTime.local().plus(timeDiff).toRelative();
      }
    },
    getEstimatedDeliveryDate(item: any, label: string){
      if(this.isPreorderBackorderItem(item)){
        return item.properties.find((property: any) => property.name === "PROMISE_DATE")["PROMISE_DATE"];
      }
      const product = this.getPreorderItemAvailability(item.sku);
      if(product.label === label){
        return DateTime.fromISO(product.estimatedDeliveryDate).toFormat("MM/dd/yyyy");
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      sendOutline,
      swapVerticalOutline,
      callOutline,
      mailOutline,
      router,
      store
    };
  },
});
</script>

<style scoped>
ion-content > div {
  max-width: 400px;
  margin-right: auto;
  margin-left: auto;
}

.center-align {
  display: flex;
  justify-content: center;
}
</style>
