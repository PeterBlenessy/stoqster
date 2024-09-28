<template>
  <q-page padding>
    <ComponentStocks />
  </q-page>
</template>

<script>
import ComponentStocks from '../components/ComponentStocks.vue'

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageStocks',
  components: {
    ComponentStocks,
  },
})
</script>
