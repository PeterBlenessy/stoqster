<template>
    <q-page padding>
        <ComponentFbindex api="getCompanies" />
    </q-page>
</template>

<script>
import ComponentFbindex from "../components/ComponentFbindex.vue";

import { defineComponent } from "vue";

export default defineComponent({
    name: "PageIndex",
    components: {
        ComponentFbindex,
    },
});
</script>
