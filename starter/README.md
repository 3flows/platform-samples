# Starter

An empty 3flows Platform project: one HTTP server, no services yet. Copy it to start your own app,
or follow the tutorial from [Hello World](https://3flows.github.io/platform-docs/docs/tutorial/hello-world).

Setup, step by step: https://3flows.github.io/platform-docs/docs/tutorial/setup

```sh
corepack enable
yarn install
yarn start        # the platform starts; curl localhost:3000/health answers OK
yarn test
```

`package.json` links the platform from a local checkout next to this repository (`portal:../../platform`),
because the features used in the tutorial are not published yet. If you copy the starter somewhere else,
adjust that path. Once the platform is published, replace it with `"@3flows/platform": "next"`.
