<template>
    <q-page padding>
        <ComponentIbindex api="getCompanies" />
    </q-page>
</template>

<script>
import ComponentIbindex from "../components/ComponentIbindex.vue";

import { defineComponent } from "vue";

export default defineComponent({
    name: "PageIndex",
    components: {
        ComponentIbindex,
    },
});
</script>
