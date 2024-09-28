<template>
  <div class="q-pa-sm">
    <q-table
      dense
      wrap-cells
      color="primary"
      class="my-sticky-header-table"
      row-key="symbol"
      :title="title"
      :rows="rows"
      :columns="columns"
      :visible-columns="visibleColumns"
      :filter="filter"
      binary-state-sort
      virtual-scroll
      virtual-scroll-slice-size="100"
      virtual-scroll-slice-ratio-before="2"
      virtual-scroll-slice-ratio-after="2"
      virtual-scroll-sticky-size-start="28"
      virtual-scroll-item-size="28"
      virtual-scroll-sticky-size-end="33"
      v-model:pagination="pagination"
      :rows-per-page-options="[0]"
    >
      <!-- Configure top-right part of the data table component -->
      <template v-slot:top-right>
        <!-- Search input -->
        <q-input dense debounce="300" v-model="filter" placeholder="Sök i listan" style="width: 500px">
          <template v-slot:append>
            <q-icon name="mdi-filter-variant" />
          </template>
        </q-input>

        <!-- Refresh data -->
        <q-btn dense flat round icon="mdi-refresh" :color="refreshColor" :loading="loading" @click="loadDataFromWeb()">
          <q-tooltip transition-show="scale" transition-hide="scale">{{ "Uppdatera" }}</q-tooltip>
        </q-btn>
      </template>

      <!-- Table header row -->
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props" style="vertical-align: bottom">
            {{ col.label }}
            <q-tooltip transition-show="scale" transition-hide="scale">
              {{ col.label }}
            </q-tooltip>
          </q-th>

          <!-- Column selection  -->
          <q-th auto-width>
            <q-select
              multiple
              dense
              options-dense
              borderless
              dropdown-icon="mdi-dots-vertical"
              style="size: 300px"
              v-model="visibleColumns"
              display-value
              emit-value
              map-options
              :options="columns"
              option-value="name"
            >
              <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                <q-item v-bind="itemProps" dense>
                  <q-item-section>
                    <q-item-label v-html="opt.label" />
                  </q-item-section>

                  <q-item-section side>
                    <q-toggle size="xs" :model-value="selected" @update:model-value="toggleOption(opt)" />
                  </q-item-section>
                </q-item>
              </template>
              <q-tooltip transition-show="scale" transition-hide="scale">
                {{ "Välj kolumner" }}
              </q-tooltip>
            </q-select>
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props" @click="props.expand = !props.expand">
          <!-- Column values -->
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            {{ col.value }}
            <q-tooltip transition-show="scale" transition-hide="scale">
              {{ col.label + ': ' + col.value }}
            </q-tooltip>
          </q-td>

          <!-- Action buttons -->
          <q-td auto-width>
            <!-- Expand more details -->
            <q-btn size="sm" color="primary" flat round dense :icon="props.expand ? 'mdi-chevron-up' : 'mdi-chevron-down'">
              <q-tooltip transition-show="scale" transition-hide="scale">
                {{ "Visa innehav" }}
              </q-tooltip>
            </q-btn>
          </q-td>
        </q-tr>

        <!--  Expanded row. Displays information about the stock's holdings.  -->
        <q-tr v-if="props.expand" :props="props" no-hover>
          <q-td :colspan="props.cols.length + 1">
            <ComponentStockHoldings :stock-symbol="props.row['symbol']" :key="props.row['symbol']" />
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script>
import { fetchStockData, storeStockData, getStoredStockData } from '../api/stockAPI.js';
import { ref, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import localforage from 'localforage';
import ComponentStockHoldings from './ComponentStockHoldings.vue';

export default {
  name: 'ComponentStocks',
  components: {
    ComponentStockHoldings,
  },
  setup() {
    const $q = useQuasar();

    const title = ref('Stocks');
    const columns = ref([
      { name: 'symbol', label: 'Symbol', field: 'symbol', align: 'left', required: true, sortable: true },
      { name: 'name', label: 'Name', field: 'name', align: 'left', required: true, sortable: true },
      { name: 'price', label: 'Price', field: 'price', align: 'right', required: true, sortable: true },
      { name: 'change', label: 'Change', field: 'change', align: 'right', required: true, sortable: true },
      { name: 'percentChange', label: 'Percent Change', field: 'percentChange', align: 'right', required: true, sortable: true },
      { name: 'marketCap', label: 'Market Cap', field: 'marketCap', align: 'right', required: true, sortable: true },
    ]);
    const visibleColumns = ref(['symbol', 'name', 'price', 'change', 'percentChange', 'marketCap']);
    const rows = ref([]);
    const loading = ref(false);
    const refreshColor = ref('primary');

    async function loadDataFromWeb() {
      console.time("loadDataFromWeb()");
      loading.value = true;
      const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']; // Example stock symbols
      const stockDataPromises = stockSymbols.map(symbol => fetchStockData(symbol));
      try {
        const stockDataArray = await Promise.all(stockDataPromises);
        rows.value = stockDataArray;
        stockDataArray.forEach(stockData => storeStockData(stockData.symbol, stockData));
        refreshColor.value = 'primary';
        $q.notify({ type: 'positive', message: 'Uppdateringen gick bra' });
      } catch (error) {
        console.log(error);
        refreshColor.value = 'negative';
        $q.notify({ type: 'negative', message: 'Något gick fel under uppdateringen' });
      } finally {
        loading.value = false;
        console.timeEnd("loadDataFromWeb()");
      }
    }

    async function loadDataFromDB() {
      console.time("loadDataFromDB()");
      loading.value = true;
      const stockStore = localforage.createInstance({ name: 'stoqster', storeName: 'stocks' });
      const stockSymbols = await stockStore.keys();
      const stockDataPromises = stockSymbols.map(symbol => getStoredStockData(symbol));
      try {
        const stockDataArray = await Promise.all(stockDataPromises);
        rows.value = stockDataArray;
      } catch (error) {
        console.log(error);
      } finally {
        loading.value = false;
        console.timeEnd("loadDataFromDB()");
      }
    }

    async function loadData() {
      loading.value = true;
      const stockStore = localforage.createInstance({ name: 'stoqster', storeName: 'stocks' });
      const numberOfStocks = await stockStore.length();
      if (numberOfStocks === 0) {
        loadDataFromWeb()
          .then(() => {
            console.log('Data loaded from web');
            $q.notify({ type: 'positive', message: 'Uppdateringen gick bra' });
          })
          .catch(error => {
            console.log(error);
            $q.notify({ type: 'negative', message: 'Något gick fel under uppdateringen' });
          })
          .finally(() => loading.value = false);
      } else {
        loadDataFromDB()
          .then(() => console.log('Data loaded from DB'))
          .catch(error => console.log(error))
          .finally(() => loading.value = false);
      }
    }

    onMounted(() => {
      loadData();
    });

    return {
      title,
      columns,
      visibleColumns,
      rows,
      filter: ref(''),
      loading,
      refreshColor,
      loadDataFromWeb,
      pagination: ref({
        rowsPerPage: 0
      })
    }
  }
}
</script>

<style>
.q-table tbody td:after {
  background: rgba(255, 255, 255, 0);
}

.q-table--dark tbody td:after {
  background: rgba(0, 0, 0, 0);
}

.q-table tbody td:before {
  background: rgba(0, 0, 0, 0.04);
}

.q-table--dark tbody td:before {
  background: rgba(255, 255, 255, 0.04);
}
</style>

<style lang="sass" scoped>
.my-sticky-header-table
  /* height or max-height is important */
  height: calc(100vh - 100px)

  .q-table__top,
  .q-table__middle,
  .q-table__bottom,
  thead tr:first-child th
    /* bg color is important for th; just specify one */
    background-color: #ffffff

  thead tr
    top: 0
    position: sticky
    z-index: 2
    text-transform: uppercase

  &.q-table--dark 
    .q-table__top,
    .q-table__middle,
    .q-table__bottom,
    thead tr:first-child th
      /* bg color is important for th; just specify one */
      background-color: #1d1d1d
</style>
