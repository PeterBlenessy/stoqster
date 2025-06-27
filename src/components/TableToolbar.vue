<template>
    <div class="row items-center q-gutter-sm">
        <!-- Filter input -->
        <q-input
            dense
            debounce="300"
            v-model="filterModel"
            :placeholder="placeholder"
            style="width: 500px"
        >
            <template v-slot:append>
                <q-icon name="mdi-filter-variant" />
            </template>
        </q-input>

        <!-- Refresh button -->
        <q-btn
            flat
            round
            dense
            icon="mdi-refresh"
            :color="refreshColor"
            :loading="loading"
            @click="$emit('refresh')"
        >
            <q-tooltip
                transition-show="scale"
                transition-hide="scale"
            >
                {{ refreshTooltip }}
            </q-tooltip>
        </q-btn>

        <!-- Additional actions slot -->
        <slot name="actions"></slot>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    filter: {
        type: String,
        default: ''
    },
    placeholder: {
        type: String,
        default: 'Sök i listan'
    },
    refreshColor: {
        type: String,
        default: 'primary'
    },
    loading: {
        type: Boolean,
        default: false
    },
    refreshTooltip: {
        type: String,
        default: 'Uppdatera'
    }
})

const emit = defineEmits(['update:filter', 'refresh'])

const filterModel = computed({
    get: () => props.filter,
    set: (value) => emit('update:filter', value)
})
</script>