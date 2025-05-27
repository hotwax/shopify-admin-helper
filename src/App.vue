<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { defineComponent } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from '@/event-bus'
import { useStore } from 'vuex';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet
  },
  data () {
    return {
      loader: null as any
    }
  },
  methods: {
    async presentLoader(options = { message: '', backdropDismiss: false }) {
      this.loader = await loadingController
        .create({ 
          message: options.message ? this.$t(options.message) : (options.backdropDismiss ? this.$t("Click the backdrop to dismiss.") : this.$t("Loading...")),
          translucent: true,
          backdropDismiss: false
        });
      await this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
      }
    }
  },
  created() {
    //Stored route params in state as we are unable to access them when token expires and gets redirected to login page.
    const routeParams = Object.keys(this.$route.query).length ? this.$route.query : this.$route.redirectedFrom?.query;
    this.store.dispatch('shop/setRouteParams', routeParams);
  },
  mounted() {
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
  setup() {
    const store = useStore();

    return {
      store
    };
  },
});
</script>