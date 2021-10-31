<template>
  <q-page padding>
    <Ibindex api="getCompanies" />
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
