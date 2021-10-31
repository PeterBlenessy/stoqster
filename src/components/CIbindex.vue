<template>
  <div class="q-pa-md">
    <q-table dense color="primary"
      :title="title"
      :rows="rows"
      :columns="columns"
      :filter="filter"
      row-key="product"
      :expanded="expanded"
      :visible-columns="visibleColumns"
      :rows-per-page-options="[0]"
      :loading="loading"
      :grid="gridMode"
    >

      <template v-slot:top-right>
        <q-input dense debounce="300" v-model="filter" placeholder="Search">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>

        <q-btn flat round class="q-ml-md" :icon="gridModeIcon" color="primary" @click="toggleGridMode()">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ gridModeTooltip }}
          </q-tooltip>
        </q-btn>
        
        <q-btn flat round class="q-ml-md" icon="refresh" :color="refreshColor" @click="refreshData()">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ "Refresh data" }}
          </q-tooltip>
        </q-btn>
      </template>

      <!-- -->
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            {{ col.label }}
          </q-th>

          <q-th auto-width />
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <!-- Display column values-->
          <q-td
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            {{ col.value }}
          </q-td>

          <!-- Display row expansion button. -->
          <q-td auto-width>
            <q-btn size="sm" color="primary" flat round dense @click="toggleExpanded(props.key)" icon="dashboard_customize">
              <q-tooltip transition-show="scale" transition-hide="scale">
                {{ "Dashboard settings" }}
              </q-tooltip>
            </q-btn>
          </q-td>
        </q-tr>

        <!--  Expanded row displays checkboxes for what to watch / show on dashboard page  -->
        <q-tr v-show="props.expand" :props="props">
          <q-td
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            <q-checkbox :val="col.name" size="xs" v-model="selected" /> <!--  @click="onCheckboxClick(props.key, col.name)" -->
          </q-td>
          <q-td auto-width />
        </q-tr>
      </template>

    </q-table>
  </div>
</template>

<script>

import { ibindex, ibiAxiosOptions } from '../api/ibindex/ibindexAPI.js'
import { defineComponent, ref, toRef } from 'vue'
import { useQuasar } from 'quasar'

export default defineComponent({ 
  name: 'CIbindex',

  props: {
    api: { type: String, required: true }
  },

  setup (props) {
    const $q = useQuasar()
    const gridMode = ref(false)
    const loading = ref(false)
    const refreshColor = ref('primary')
    const gridModeIcon = ref('grid_view')
    const gridModeTooltip = ref('Grid view')

    const api = toRef(props, 'api')
    const title = ibindex[api.value].title
//    const columns = ibindex[api.value].columns
    const visibleColumns = ibindex[api.value].visibleColumns
    const columns = ibindex[api.value].columns
    const rows = ref([])
    const expanded = ref([])
    const selected = ref([])

    const refreshData = async () => {
      loading.value = true

      window.ipc.axiosRequest( ibiAxiosOptions(api.value) )
        .then( response => { 
          rows.value = response.data
        }).catch( error => {
          console.log(error) 
        }).finally(() => { 
          loading.value = false;
          refreshColor.value = (rows.value.length === 0) ? 'red' : 'primary'
      })
    }    

    const toggleGridMode = () => {
      gridMode.value = !gridMode.value
      gridModeIcon.value = gridMode.value ? 'table_view' : 'grid_view'
      gridModeTooltip.value = gridMode.value ? 'Table view' : 'Grid view'
    }

    function toggleExpanded (rowKey) {

      // Handle UC: Expanding new row. No row was expanded before. 
      if (expanded.value.length == 0) {
        expanded.value = [rowKey]
        // Fetch checkboxes to select for expanded row from localStorage
        selected.value = $q.localStorage.has(rowKey) ? JSON.parse($q.localStorage.getItem(rowKey)) : []
        return
      }

      // Handle UC: Closing expanded row. No new row is being expanded.
      if (expanded.value[0] === rowKey) {

        // Save checkbox values -> remove / update rowKey
        if (selected.value.length == 0) {
          // Either nothing checked or unckecked all checkboxes
          //  => remove row (company) from localStorage watchlist
          $q.localStorage.remove(expanded.value[0])
        } else {
          // Save selected checkbox values to localStorage
          let value = JSON.stringify(selected.value)
          $q.localStorage.set(expanded.value[0], value)
        }
        // Closing row, so reset both expanded row and selected checkboxes
        expanded.value = []
        selected.value = []
        return
      }

      // Handle UC: Expanding new row, and closing previously expanded row.

      // Save checkbox values -> update / remove rowKey
      if (selected.value.length == 0) {
        // Either nothing checked or unckecked all checkboxes
        //  => remove row (company) from localStorage watchlist
        $q.localStorage.remove(expanded.value[0])
      } else {
        // Save selected checkbox values to localStorage
        let value = JSON.stringify(selected.value)
        $q.localStorage.set(expanded.value[0], value)
      }

      // Fetch checkboxes to select for expanded row from localStorage
      selected.value = $q.localStorage.getItem(rowKey) ? JSON.parse($q.localStorage.getItem(rowKey)) : []
      expanded.value = [rowKey]
      return
    }

    function onCheckboxClick(key, value) {

      // add
      let valuesRaw = $q.localStorage.getItem(key)
      let valuesParsed =  values ? JSON.parse(valuesRaw) : []
      valuesParsed.array.push(value)

      //remove
      // valuesParsed = valuesParsed.filter(item => item !== value)
      // console.log(valuesParsed)

      let valuesStringified = JSON.stringify(valuesJSON)
      $q.localStorage.set(key, valuesStringified)

      


    }

    return {
      title,
      columns,
      visibleColumns,
      rows,
      filter: ref(''),
      expanded,
      selected,

      loading,
      refreshColor,
      gridMode, gridModeIcon, gridModeTooltip,

      refreshData,
      toggleGridMode,
      toggleExpanded,
      onCheckboxClick
    }

  },
  computed: {
    
  },

  data: () => ({
    
  }),

  mounted () {
    this.refreshData();
  },
})
</script>
