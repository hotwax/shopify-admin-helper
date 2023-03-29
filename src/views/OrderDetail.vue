<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
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
              <ion-button :disabled="JSON.stringify(order) == JSON.stringify(initialOrder)" fill="clear" color="medium" slot="end" @click="undo(item)">
                <ion-icon slot="icon-only" :icon="arrowUndoOutline" />
              </ion-button>            
            </ion-item>
            <ion-item>
              <ion-label>{{ $t('Delivery method') }}</ion-label>
              <ion-select interface="popover" :value="item.deliveryMethodTypeId" @ionChange="updateDeliveryMethod($event, item)">
                <ion-select-option v-for="method in deliveryMethods" :key="method.value" :value="method.value">{{ method.name }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-radio-group v-if="item.deliveryMethodTypeId !== 'STOREPICKUP'" :value="checkPreorderBackorderItem(item)" @ionChange="markPreorderBackorderItem(item, $event)">
              <ion-item class="border-top">
                <ion-radio :disabled="isPreorderOrBackorderProduct(item, 'PRE-ORDER')" slot="start" value="Pre Order" />
                <ion-label>{{ $t("Pre Order") }}</ion-label>
                <ion-note slot="end" :color="getEstimatedDeliveryDate(item, 'PRE-ORDER') ? '' : 'warning'">{{ getEstimatedDeliveryDate(item, "PRE-ORDER") ? getEstimatedDeliveryDate(item, "PRE-ORDER") : $t("No shipping estimates") }}</ion-note>
              </ion-item>
              <ion-item class="border-top">
                <ion-radio :disabled="isPreorderOrBackorderProduct(item, 'BACKORDER')" slot="start" value="Back Order" />
                <ion-label >{{ $t("Back Order") }}</ion-label>
                <ion-note slot="end" :color="getEstimatedDeliveryDate(item, 'BACKORDER') ? '' : 'warning'">{{ getEstimatedDeliveryDate(item, "BACKORDER") ? getEstimatedDeliveryDate(item, "BACKORDER") : $t("No shipping estimates") }}</ion-note>
              </ion-item>
            </ion-radio-group>
            <ion-button v-else-if="item.deliveryMethodTypeId === 'STOREPICKUP' && !item.selectedFacility" @click="updatePickupLocation(item)" expand="block" fill="outline">{{ $t("Select pickup location")}}</ion-button>
            <ion-item v-else>
              <ion-list>
                <ion-label>{{ item.selectedFacility.facilityName }} </ion-label>
                <ion-label color="dark">{{ item.selectedFacility.address1 }} </ion-label>
                <ion-label color="dark">{{ item.selectedFacility.city }}</ion-label>
              </ion-list>
              <ion-button slot="end" @click="updatePickupLocation(item)" color="medium" fill="outline">{{ $t("Change Store")}}</ion-button>
            </ion-item>
          </ion-card>
        </main>
        <div class="text-center center-align">
          <ion-button :disabled="JSON.stringify(order) == JSON.stringify(initialOrder)" @click="save()">{{ $t("Save changes to order") }}</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>
<script lang="ts">
import {
  alertController,
  IonButton,
  IonCard,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  IonRadio,
  IonRadioGroup,
  modalController
} from "@ionic/vue";
import { arrowUndoOutline } from "ionicons/icons";
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon';
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";
import PickupLocationModal from "./PickupLocationModal.vue";
import { translate } from "@/i18n";
import { showToast } from "@/utils";

export default defineComponent({
  name: 'OrderDetail',
  components: {
    IonButton,
    IonCard,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    IonRadio,
    IonRadioGroup
  },
  data() {
    return {
      initialOrder: {} as any,
      deliveryMethods: [
        {
          name: 'Store pickup',
          value: 'STOREPICKUP'
        },
        {
          name: 'Shipping',
          value: 'STANDARD'
        }
      ]
    }
  },
  computed: {
    ...mapGetters({
      order: 'order/getDraftOrder',
      shopifyStores: 'shop/getStores',
      getPreorderItemAvailability: 'stock/getPreorderItemAvailability',
      routeParams: 'shop/getRouteParams'
    })
  },

  async mounted(){
    if (this.$route.query.id) {
      await this.store.dispatch('order/getDraftOrder', this.$route.query.id);
    }
    this.initialOrder = JSON.parse(JSON.stringify(this.order));
  },
  methods: {
    updateDeliveryMethod(event: any, item: any) {
      item.deliveryMethodTypeId = event.detail.value;
      item.properties = item.properties.filter((property: any) => !(property.name === '_pickupstore' || property.name === 'Store Pickup' || property.name === 'Pickup Store'))
      if (item.isBopis) {
        const store = this.shopifyStores[0];
        const address = [store.storeName, store.address1, store.city].slice().join(", ");
        item.properties.push({ name: '_pickupstore', value: store.storeCode }, { name: 'Store Pickup', value: address })
      }
      this.store.dispatch('order/updateLineItems', this.order)
    },
    isPreorderOrBackorderProduct(item: any, label: string){
      const product = this.getPreorderItemAvailability(item.sku);  
      return !(product.label === label);
    },
    markPreorderBackorderItem (item: any, event: any) {
      const product = this.getPreorderItemAvailability(item.sku)
      item.properties.push({ name: 'Note', value: event.detail.value });
      if(product.estimatedDeliveryDate){
        item.properties.push({ name: 'PROMISE_DATE', value: DateTime.fromISO(product.estimatedDeliveryDate).toFormat("MM/dd/yyyy") })
      }
      this.store.dispatch('order/updateLineItems', this.order);
    },
    async updateDraftOrder () {
      const shopConfig = JSON.parse(process.env.VUE_APP_SHOPIFY_SHOP_CONFIG);
      await this.store.dispatch('order/updateDraftOrder', this.order).then(() => {
        const app = createApp({
          apiKey: shopConfig[this.routeParams.shop].apiKey,
          host: this.routeParams.host
        });
        Redirect.create(app).dispatch(Redirect.Action.ADMIN_PATH, `/draft_orders/${this.routeParams.id}`);
      })
    },
    checkPreorderBackorderItem (item: any) {
      const property = item.properties?.find((property: any) => property.name === 'Note')?.value;
      return property ? property : "" ;
    },
    timeFromNow (time: string) {
      if (time) {
        const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
        return DateTime.local().plus(timeDiff).toRelative();
      }
    },
    getEstimatedDeliveryDate(item: any, label: string){
      const labelMapping = {
        "BACKORDER": "Back Order",
        "PRE-ORDER": "Pre Order",
      } as any
      if(this.checkPreorderBackorderItem(item) === labelMapping[label]) {
        return item.properties.find((property: any) => property.name === "PROMISE_DATE") ? item.properties.find((property: any) => property.name === "PROMISE_DATE").value : "";
      }
      const product = this.getPreorderItemAvailability(item.sku);
      if(product.label === label){
        return DateTime.fromISO(product.estimatedDeliveryDate).toFormat("MM/dd/yyyy");
      }
    },
    async updatePickupLocation(item: any) {
      const modal = await modalController
        .create({
          component: PickupLocationModal,
          // Adding backdropDismiss as false because on dismissing the modal through backdrop,
          // backrop.role returns 'backdrop' giving unexpected result
          backdropDismiss: false,
          componentProps: { item }
        })
      modal.onDidDismiss().then((result) => {
        if (result.role) {
          // role will have the passed data
          item.selectedFacility = result.role
          const address = [item.selectedFacility.storeName, item.selectedFacility.address1, item.selectedFacility.city].slice().join(", ");
          item.properties.push({ name: '_pickupstore', value: item.selectedFacility.storeCode }, { name: 'Store Pickup', value: address })
          this.store.dispatch('order/updateLineItems', this.order);
        }
      });
      return modal.present();
    },
    async save() {
      const message = this.$t("Are you sure you want to save the changes?");
      const alert = await alertController.create({
        header: this.$t("Save changes"),
        message,
        buttons: [
          {
            text: this.$t("Cancel"),
          },
          {
            text: this.$t("Confirm"),
            handler: () => {
              this.updateDraftOrder()
            }
          }
        ],
      });
      return alert.present();
    },
    async undo(item: any) {
      const header = this.$t('Clear edits')
      const message = this.$t('Are you sure you want to undo the changes you’ve made to this order item?')

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          },{
            text: this.$t('Clear'),
            handler: async () => {
              // finding the initial line_item (without edits) and updating it in this.order
              const initialItem = this.initialOrder.line_items.find((lineItem: any) => lineItem.id === item.id)
              const index = this.order.line_items.findIndex((lineItem: any) => lineItem.id === item.id)
              this.order.line_items.splice(index, 1, initialItem)
              this.store.dispatch('order/updateLineItems', this.order)
              showToast(translate('Previous edits cleared successfully'))
            }
          }]
        });
      return alert.present();
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      arrowUndoOutline,
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
