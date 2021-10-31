<template>
  <q-page padding>
    <Dashboard />
  </q-page>
</template>

<script>
import Dashboard from 'components/CDashboard.vue'

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageIndex',
  components: {
    Dashboard,
  },
})
</script>
