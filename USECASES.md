# Stoqster

## Application features

- [x] Sidebar with menu items
- [x] Toolbar with icons
- [x] Tooltip
- [x] Dark/light mode
- [x] In app notifications
- [x] Automatic updates
- [x] Persisted state

## Display information fetched from www.ibindex.se
Ibindex is a web page presenting information about investment companies in Sweden.

- [x] Searchable table showing information about investment companies, e.g., net asset value, rebate/premium.
- [x] Expand/hide list of investment companies rows and display additional information, e.g., company holdings, event calendar.
- [x] Dashboard of cards with selected investment companies, showing the calculated rebate/premium, and an expandable list of the historical values. Persisted selection.
- [x] Set/delete alarm on the dashboard: current value crossing 30 days' average. Persisted alarms.
- [x] Searchable table showing market weights of investment companies.
- [x] Display notification when refresh of data is done.
- [x] Display notification when alarm is triggered.

## Display information fetched from www.fi.se

### Latest quarterly fund holdings
Fund managers report their holdings to Finansinspektionen, Sweden's financial supervisory authority, on a quarterly basis and holdings is available for download as a zip archive of XML files at https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/

- [x] Display fund information in a table. Searchable.
- [x] Selectable visible columns.
- [x] Display fund holdings.
- [ ] Display all instruments in one big list
- [x] Make fund holdings table filterable.

## Update System

The app includes a robust automatic update system built with Tauri's updater plugin.

### Features
- **Automatic Update Checks**: Checks for updates on app startup and at regular intervals (configurable, default: 60 minutes)
- **Manual Update Checks**: User can manually check for updates via menu item in left drawer
- **Update Scheduling**: Users can choose to install updates immediately or schedule for next restart
- **Persistent State**: Last update check time is stored in localStorage and persists across app restarts
- **User Notifications**: Swedish notifications using Quasar notify system for all update events
- **Detailed Logging**: Comprehensive console logging with emojis for debugging and monitoring

### Components
- **Update Composable** (`src/composables/useUpdater.js`): Core update logic as a reusable composable
- **Update Store** (`src/stores/update-store.js`): Pinia store wrapper around the update composable
- **UpdateDialog** (`src/components/UpdateDialog.vue`): Dialog showing update details and options
- **MainLayout Integration**: Menu item in drawer showing update status and current version

### Update Flow
1. **Startup**: Check for scheduled updates, then check for new updates after 5 seconds
2. **Automatic**: Check for updates every hour (configurable interval)
3. **Manual**: User clicks update menu item to force check
4. **Available**: Show notification with "Show details" action, update menu badge
5. **Install Options**: Install now, schedule for restart, or defer
6. **Installation**: Download and install with progress feedback, app restarts automatically

### Storage Keys
- `stoqster-last-update-check`: ISO timestamp of last update check
- `stoqster-scheduled-update`: JSON object with update info for deferred installation

### User Interface
- **Menu Item**: Shows update status, current version, and last check time
- **Notifications**: Toast notifications for update availability and progress
- **Dialog**: Detailed update information with release notes and install options
- **Badge**: Orange badge on menu item when updates are available

#### Flowchart

```mermaid
flowchart LR

%% Definition of the different elements in the flowchart

onMounted(onMounted)
onRefresh(onRefresh)

refresh(refresh data )

fetch("download \n fetch()")
blob("response.blob() \n get blob \n ")
unzip(unzip)
getxml("entry.text() \n get one xml file \n ")
json("xml2json() \n convert \n one xml file \n to json")

files[(files)]
dB[("dataBase")]


%% The main loop

subgraph main
    direction LR

    onMounted
    onRefresh
    refresh
end

%% The fetch flow

subgraph fetchZip
    direction TB

    fetch --> blob --> unzip --> getxml --> json
end

subgraph IndexedDB
    direction TB

    files
    dB
end


%% How much time is spent in the different blocks
fetch   -- "400 ms"         .-fetch
blob    -- "3 000 ms"       .-blob
unzip   -- "10 ms"          .-unzip
getxml  -- "0.2 - 2 ms"     .-getxml
json    -- "0.2 - 8 ms"     .-json

%% Function calls
onMounted   --> refresh
onRefresh   --> refresh
refresh     --> fetchZip

%% Read/write operations
%%blob    -. "write"  .-> files
%%unzip   -. "read"   .-> files

%%getxml  -. "read"   .-> dB
%%json    -. "write"   .-> dB
