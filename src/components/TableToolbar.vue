<template>
    <div class="row items-center q-gutter-sm">
        
        <!-- Additional actions slot (for quarter selector) - moved to left -->
        <slot name="actions"></slot>
        
        <!-- Filter input -->
        <q-input
            dense outlined
            debounce="300"
            v-model="filterModel"
            :label="placeholder"
            style="width: 500px"
        >
            <template v-slot:prepend>
                <q-icon name="mdi-magnify" />
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