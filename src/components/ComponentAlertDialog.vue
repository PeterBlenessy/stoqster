<template>
    <q-dialog persistent ref="dialogRef" @hide="onDialogHide">
        <q-card class="q-pa-md">
            <div class="q-gutter-y-md column">
                <div class="text-h6">Alert: {{ companyName }}</div>

                A notification will be sent when the current value of the {{ fieldLabel }} of {{ companyName }} crosses the 30 days avarage.
                <q-separator />

                <!-- Trigger options -->
                <q-select label="Larmet triggas av" dense options-dense stack-label outlined
                    v-model="trigger" :options="triggerOptions" map-options readonly hide-dropdown-icon/>

                <!-- Time period -->
                <q-select label="Tidsperiod" dense options-dense stack-label outlined v-model="timePeriod"
                    :options="timePeriodOptions" map-options readonly hide-dropdown-icon />

                <!-- Expiration date -->
                <q-input label="Giltighetstid" dense stack-label outlined
                    v-model="expirationDate" mask="date" :rules="['date']">

                    <template v-slot:append>
                        <q-icon name="mdi-calendar" class="cursor-pointer">
                            <q-popup-proxy
                                ref="qDateProxy"
                                cover
                                transition-show="scale"
                                transition-hide="scale"
                            >
                                <q-date v-model="expirationDate">
                                    <div class="row items-center justify-end">
                                        <q-btn v-close-popup label="Stäng" color="primary" flat />
                                    </div>
                                </q-date>
                            </q-popup-proxy>
                        </q-icon>
                    </template>
                </q-input>

                <!-- Alert actions -->
                <q-option-group type="checkbox" dense color="primary" inline v-model="alertAction" :options="actionOptions"/>

                <!-- Alert name -->
                <q-input label="Larmets namn" type="text" dense stack-label outlined v-model="alertName"/>

                <!-- Alert description -->
                <q-input label="Meddelande när larmet triggas" type="textarea" dense stack-label outlined v-model="alertMessage"/>

                <div>
                    <q-space />
                    <!-- Cancel alert -->
                    <q-btn flat color="grey" icon="mdi-close" v-close-popup @click="onCancelClick">
                        <q-tooltip transition-show="scale" transition-hide="scale">{{ "Avbryt" }}</q-tooltip>
                    </q-btn>
                    <!-- Save alert -->
                    <q-btn v-show="hasAlert" flat color="negative" icon="mdi-delete" v-close-popup @click="onDeleteAlert()">
                        <q-tooltip transition-show="scale" transition-hide="scale">{{ "Ta bort" }}</q-tooltip>
                    </q-btn>
                    <!-- Save alert -->
                    <q-btn flat color="primary" icon="mdi-content-save" v-close-popup @click="onSaveAlert()">
                        <q-tooltip transition-show="scale" transition-hide="scale">{{ "Spara larm" }}</q-tooltip>
                    </q-btn>
                </div>
            </div>
        </q-card>
    </q-dialog>
</template>

<script>

import { ref, toRefs, onMounted } from 'vue';
import { useDialogPluginComponent } from 'quasar'
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings-store.js';

export default {
    name: 'ComponentAlertDialog',

    props: {
        companyCode: { type: String, required: true },
        companyName: { type: String, required: true },
        field: { type: String, required: true },
        fieldLabel: { type: String, required: true },
        fieldValue: { type: Number, required: true }
    },

    emits: [
        // REQUIRED; need to specify some events that your
        // component will emit through useDialogPluginComponent()
        ...useDialogPluginComponent.emits
    ],

    setup(props) {
        const settingsStore = useSettingsStore();
        const { alerts } = storeToRefs(settingsStore);

        // We can do this since all props are required
        const { companyCode, companyName, field, fieldLabel, fieldValue } = toRefs(props);
        const hasAlert = ref(false);

        // REQUIRED; must be called inside of setup()
        const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
        // dialogRef      - Vue ref to be applied to QDialog
        // onDialogHide   - Function to be used as handler for @hide on QDialog
        // onDialogOK     - Function to call to settle dialog with "ok" outcome
        //                    example: onDialogOK() - no payload
        //                    example: onDialogOK({ /*.../* }) - with payload
        // onDialogCancel - Function to call to settle dialog with "cancel" outcome

        const triggerOptions = [
                { label: 'korsar', value: 'crossing', active: true },
                { label: 'korsar ner', value: 'crossing-down', disable: true },
                { label: 'korsar upp', value: 'crossing-up', disable: true }
        ];

        const timePeriodOptions = [
                { label: '30-dagars medelvärde', value: '30-days-average' },
                { label: '3-månaders medelvärde', value: '3-months-average', disable: true },
                { label: '6-månaders medelvärde', value: '6-months-average', disable: true },
                { label: '1-års medelvärde', value: '1-years-average', disable: true },
                { label: '3-års medelvärde', value: '3-years-average', disable: true },
                { label: '5-års medelvärde', value: '5-years-average', disable: true }
        ];

        const actionOptions = [
                { label: 'App-meddelande', value: 'in-app' },
                { label: 'System-meddelande', value: 'system', disable: true },
                { label: 'E-mail', value: 'email', disable: true }
        ];


        const trigger = ref('korsar');
        const timePeriod = ref('30-days-average');
        const alertName = ref(companyName.value + ' : ' + fieldLabel.value + ' : ' + trigger.value);
        const alertMessage = ref('Alarm triggades för ' + companyName.value + ' : ' + fieldLabel.value + '!');
        const alertAction = ref(['in-app']);
        const expirationDate = ref(new Date().toJSON().slice(0, 10).replace(/-/g, '/'));

        // Checks if an alert has been registered for a company
        function checkAlert() {
            hasAlert.value = alerts.value.some(item => item.companyCode === companyCode.value);
        }

        // Adds / updates alert in Vuex store
        function onSaveAlert() {
            let newAlert = {
                companyCode: companyCode.value,
                companyName: companyName.value,
                field: field.value,
                fieldLabel: fieldLabel.value,
                fieldValue: fieldValue.value,
                alert: {
                    name: alertName.value,
                    message: alertMessage.value,
                    trigger: trigger.value,
                    timePeriod: timePeriod.value,
                    action: alertAction.value,
                    expirationDate: expirationDate.value
                }
            };

            // Allow only one alarm configuration per company.
            // This filter return all other alerts, i.e., removes the alarm for company if it exists.
            alerts.value = alerts.value.filter(item => item.companyCode !== newAlert.companyCode);
            alerts.value.push(newAlert);
            console.log("Added new alert: ", newAlert);
        }

        // Removes an alert if it exists
        const onDeleteAlert = () => alerts.value = alerts.value.filter(item => item.companyCode !== companyCode.value);

        onMounted(checkAlert);

        return {
            alertName,
            alertMessage,
            trigger,
            timePeriod,
            alertAction,
            expirationDate,

            onDeleteAlert,
            onSaveAlert,

            hasAlert,
            checkAlert,

            triggerOptions,
            timePeriodOptions,
            actionOptions,

            // This is REQUIRED;
            // Need to inject these (from useDialogPluginComponent() call)
            // into the vue scope for the vue html template
            dialogRef,
            onDialogHide,

            // other methods that we used in our vue html template;
            // these are part of our example (so not required)
            onOKClick() {
                // on OK, it is REQUIRED to
                // call onDialogOK (with optional payload)

                onDialogOK();
                // or with payload: onDialogOK({ ... })
                // ...and it will also hide the dialog automatically
            },

            // we can passthrough onDialogCancel directly
            onCancelClick: onDialogCancel
        }
    },

}

</script>

<style >
</style>