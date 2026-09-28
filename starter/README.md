# Starter

An empty 3flows Platform project: one HTTP server, no services yet. Copy it to start your own app,
or follow the tutorial from [Hello World](https://3flows.github.io/platform-docs/docs/tutorial/hello-world).

Setup, step by step: https://3flows.github.io/platform-docs/docs/tutorial/setup

```sh
corepack enable
export NPM_REPOSITORY_GH_TOKEN=<a GitHub token with read:packages>
yarn install
yarn start        # the platform starts; curl localhost:3000/health answers OK
yarn test
```

The platform comes from GitHub Packages, tag `next`. `yarn up @3flows/platform@next` updates it.
