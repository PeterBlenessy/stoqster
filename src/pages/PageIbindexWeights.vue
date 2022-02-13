<template>
  <q-page padding>
    <ComponentIbindex api="getWeights" />
  </q-page>
</template>

<script>
import ComponentIbindex from 'src/components/ComponentIbindex.vue'

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageIndex',
  components: {
    ComponentIbindex,
  },
})
</script>
