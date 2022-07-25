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
              <ion-note slot="end">{{ getProductStock(item.sku, shopifyStores[0]?.storeCode) }} {{ $t("in stock") }}</ion-note>
            </ion-item>
            <ion-radio-group :value="isPreorderBackorderItem(item)" @ionChange="markPreorderBackorderItem(item, $event)">
              <ion-item class="border-top">
                <ion-radio :disabled="isPreorderOrBackorderProduct(item, 'PRE-ORDER')" slot="start" value="Pre Order" />
                <ion-label>{{ $t("Pre Order") }}</ion-label>
                <ion-note slot="end" :color="getEstimatedDeliveryDate(item, 'PRE-ORDER') ? '' : 'warning'">{{ getEstimatedDeliveryDate(item, "PRE-ORDER") ? getEstimatedDeliveryDate(item, "PRE-ORDER") : $t("No shipping estimates") }}</ion-note>
              </ion-item>
              <ion-item class="border-top">
                <ion-radio :disabled="isPreorderOrBackorderProduct(item, 'BACKORDER')" slot="start" value="Back Order" />
                <ion-label >{{ $t("Back Order") }}</ion-label>
                <ion-note slot="end" :color="getEstimatedDeliveryDate(item, 'BACKORDER') ? '' : 'warning'">{{ getEstimatedDeliveryDate(item, "BACKORDER") ? getEstimatedDeliveryDate(item, "PRE-ORDER") : $t("No shipping estimates") }}</ion-note>
              </ion-item>
            </ion-radio-group>
          </ion-card>
        </main>
        <div class="text-center center-align">
          <ion-button @click="updateDraftOrder()">{{ $t("Save changes to order") }}</ion-button>
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
      shopifyStores: 'shop/getStores',
      getProductStock: 'stock/getProductStock',
      getPreorderItemAvailability: 'stock/getPreorderItemAvailability'
    })
  },

  async mounted(){
    if (this.$route.query.id) {
      await this.store.dispatch('order/getDraftOrder', this.$route.query.id);
    }
  },
  methods: {
    isBopisItem(item: any){
      return item.properties.some((property: any) => property.name === "Pickup Store");
    },
    isPreorderOrBackorderProduct(item: any, label: string){
      const product = this.getPreorderItemAvailability(item.sku);  
      return !(product.label === label);
    },
    markBopisItem (item: any, event: any) {
      if(this.isBopisItem(item)){
        item.properties = item.properties.filter((property: any) => !(property.name === '_pickupstore' || property.name === 'Pickup Store'))
      } else {
        const store = this.shopifyStores[0];
        const address = [store.storename, store.address1, store.city].filter((value: any) => value).join(", ");
        item.properties.push({ name: '_pickupstore', value: store.storeCode }, { name: 'Pickup Store', value: address })
      }
      this.store.dispatch('order/updateLineItems', this.order)
    },
    markPreorderBackorderItem (item: any, event: any) {
      const product = this.getPreorderItemAvailability(item.sku)
      item.properties.push({ name: 'Note', value: event.detail.value });
      if(product.estimatedDeliveryDate){
        item.properties.push({ name: 'PROMISE_DATE', value: DateTime.fromISO(product.estimatedDeliveryDate).toFormat("MM/dd/yyyy") })
      }
      this.store.dispatch('order/updateLineItems', this.order);
    },
    updateDraftOrder () {
      this.store.dispatch('order/updateDraftOrder', this.order);
    },
    isPreorderBackorderItem (item: any) {
      const property = item.properties?.find((property: any) => property.name === 'Note')?.value;
      return property ?  property :  " ";
    },
    timeFromNow (time: string) {
      if (time) {
        const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
        return DateTime.local().plus(timeDiff).toRelative();
      }
    },
    getEstimatedDeliveryDate(item: any, label: string){
      if(this.isPreorderBackorderItem(item)){
        return item.properties.find((property: any) => property.name === "PROMISE_DATE") ? item.properties.find((property: any) => property.name === "PROMISE_DATE")["PROMISE_DATE"] : "";
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
