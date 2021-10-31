<template>
  <q-page padding>
    <Ibindex api="getWeights" />
  </q-page>
</template>

<script>
import Ibindex from 'components/CIbindex.vue'

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageIndex',
  components: {
    Ibindex,
  },
})
</script>
