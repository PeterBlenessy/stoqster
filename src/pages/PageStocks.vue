<template>
    <q-page padding>
        <ComponentStocks />
    </q-page>
</template>

<script>

import ComponentStocks from '../components/ComponentStocks.vue'

export default {
    name: 'PageStocks',
    components: {
        ComponentStocks,
    },
}
</script>