# Stoqster

Stoqster provides information about Swedish investment companies and funds, in particular information about the holdings.

## Features

- [x] List investment companies and their holdings
- [x] List funds and their holdings
- [x] Add/remove investment company to watch list
- [x] Display company performance in watch list
- [x] Set simple alarm in watchlist
- [ ] List real estate companies and their holdings
- [ ] List publicly listed companies
- [ ] List indexes and their holdings

More details are available in the [use cases](USECASES.md).

## Data origin
Stoqster uses information freely available on the web, specifically from [Investmentbolags Index](https://ibindex.se) and [Finansinspektionen](https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/).

[![Investmentbolags Index](https://ibindex.se/ibi/assets/images/logo.png)](https://ibindex.se)
[![Finansinspektionen](https://www.fi.se/static/gfx/images/fi-logotyp.svg)](https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/)

## License

## Contributors

### Install the dependencies
```bash
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
yarn dev
```

### Lint the files
```bash
yarn run lint
```

### Build the app for production
```bash
yarn build
```

### Publishing to GitHub
To be able to publish to github a `GH_TOKEN` needs to be generated and exported as an environment variable.

Read more: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

```bash
export GH_TOKEN=<YOUR-GH-TOKEN>
```

### Keeping packages up to date
```bash
yarn outdated
yarn upgrade
```
