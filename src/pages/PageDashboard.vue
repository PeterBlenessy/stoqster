<template>
  <q-page padding>
    <ComponentDashboard />
  </q-page>
</template>

<script>
import ComponentDashboard from 'src/components/ComponentDashboard.vue'

import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageIndex',
  components: {
    ComponentDashboard,
  },
})
</script>
