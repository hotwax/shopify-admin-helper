<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" @click="back($event)" />
        <ion-title>{{ $t("Order Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="order?.name || Object.keys(order)?.length">
        <h1 class="center-align">{{ $t("Order") }} {{ order.name }}</h1>
        <ion-card>
          <ion-list>
            <ion-item lines="none">
              <ion-label v-if="order.customer">
                <h2>{{ order.customer.first_name }} {{ order.customer.last_name }}</h2>
                <!-- TODO: Uncomment this when we'll get CRS information -->
                <!-- <p>CSR name</p> -->
              </ion-label>
              <ion-label v-else>
                <h2>{{ $t("No customer") }}</h2>
              </ion-label>
              <ion-note slot="end">{{ timeFromNow(order?.created_at) }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card>
        <ion-card>
          <ion-item v-for="(item, index) in order.line_items" :key="item.id" :lines="order.line_items.length - 1 === index ? 'full' : 'none'">
            <ion-label>
              <h2>{{ item.title }}</h2>
              <p>{{ item.variant_title }}</p>
              <p class="ion-text-wrap">{{ $t("SKU") }}: {{ item.sku }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="selectedFacility" lines="none">
            <ion-label class="ion-text-wrap">{{ selectedFacility }}</ion-label>
            <ion-button slot="end" @click="removeFacility()" color="danger" fill="clear">
              <ion-icon slot="icon-only" :icon="removeCircleOutline" />
            </ion-button>
          </ion-item>
          <ion-button v-else-if="order.line_items?.length" class="ion-margin" expand="block" fill="outline" @click="updatePickupLocation">{{ $t("Select pickup location")}}</ion-button>
        </ion-card>

        <div class="text-center center-align">
          <ion-button :disabled="!isChanged()" @click="save()">{{ $t("Save changes to order") }}</ion-button>
        </div>
      </div>

      <div v-else class="text-center center-align">
        <p>{{ $t("Order not found") }}</p>
      </div>

      <div class="text-center center-align">
        <ion-button color="danger" fill="outline" @click="back($event)">{{ $t("Exit") }}</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>
<script lang="ts">
import {
  alertController,
  IonBackButton,
  IonButton,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { removeCircleOutline } from "ionicons/icons";
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon';
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";
import PickupLocationModal from "./PickupLocationModal.vue";

export default defineComponent({
  name: 'OrderDetail',
  components: {
    IonBackButton,
    IonButton,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonPage,
    IonTitle,
    IonToolbar
  },
  data() {
    return {
      initialOrder: {} as any,
      selectedFacility: "",
      selectedFacilityId: ""
    }
  },
  computed: {
    ...mapGetters({
      order: 'order/getDraftOrder',
      shopifyStores: 'shop/getStores',
      routeParams: 'shop/getRouteParams'
    })
  },

  async mounted(){
    if (this.$route.query.id) {
      await this.store.dispatch('order/getDraftOrder', this.$route.query.id);
    }
    this.initialOrder = JSON.parse(JSON.stringify(this.order));
    this.selectedFacility = this.initialOrder?.selectedFacility
    this.selectedFacilityId = this.initialOrder?.selectedFacilityId
  },
  methods: {
    back(event: any) {
      event?.preventDefault();
      history.back()
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
    timeFromNow (time: string) {
      if (time) {
        const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
        return DateTime.local().plus(timeDiff).toRelative();
      }
    },
    async updatePickupLocation() {
      const modal = await modalController
        .create({
          component: PickupLocationModal,
          // Adding backdropDismiss as false because on dismissing the modal through backdrop,
          // backrop.role returns 'backdrop' giving unexpected result
          backdropDismiss: false,
          componentProps: { facilityId: this.selectedFacilityId }
        })
      modal.onDidDismiss().then((result) => {
        if (result.role) {
          // role will have the passed data
          const facilityData = result.role as any
          this.selectedFacility = facilityData.selectedFacility
          this.selectedFacilityId = facilityData.storeCode

          this.order.line_items.map((lineItem: any) => {
            // Filtering item properties that are not related to pickup as we want to remove the previously associated properties and add the new one
            // Using this approach, as if we will filter and update the pickup properties we will need multiple looping on the properties
            const itemProperties = lineItem.properties.filter((property: any) => property.name != "_pickupstore" && property.name != "Store Pickup")

            // Adding the selected facility information as pickup facility
            itemProperties.push({ name: '_pickupstore', value: this.selectedFacilityId }, { name: 'Store Pickup', value: this.selectedFacility })

            // Reassigning the item properties with updated properties array
            lineItem.properties = itemProperties
          })

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
    isChanged() {
      if (Object.keys(this.order).length && Object.keys(this.initialOrder).length) {
        return this.selectedFacility;
      }
      return false;
    },
    removeFacility() {
      this.selectedFacility = ""
      this.selectedFacilityId = ""
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      removeCircleOutline,
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
