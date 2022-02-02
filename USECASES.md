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
- [x] Display notification when alarm ir triggered.

## Display information fetched from www.fi.se

### Latest quarterly fund holdings
Fund managers report their holdings to Finansinspektionen, Sweden's financial supervisory authority, on a quarterly basis and holdings is available for download as a zip archive of XML files at https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/

- [x] Display fund information in a table. Searchable.
- [x] Selectable visible columns.
- [x] Display fund holdings.
- [] Display all instruments in one big list
- [] Make fund holdings table filterable

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


```


## Display information fetched from Placera news feed