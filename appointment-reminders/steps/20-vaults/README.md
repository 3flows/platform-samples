# Step 20 – Keep secrets in a vault

The code is identical to step 19. A `vaults` entry says where secrets come from, and `$vault` references in YAML
take the Twilio credentials and the partner database's connection string from it – YAML only.

In development the vault is `memory`, with fake values. In production only the `vaults` entry changes
(`hashicorp`, `azure-key-vault` or `macos-keychain`); the references stay the same.

```sh
yarn step:20
curl localhost:3000/admin/api/configuration   # shows the references, never the secrets
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/vaults
