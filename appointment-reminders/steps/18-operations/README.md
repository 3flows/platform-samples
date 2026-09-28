# Step 18 – Operate it

No code changes. Every HTTP server already offers `/ping`, `/health`, `/metrics`, `/openapi.json`, `/openapi.yml` and JSON-RPC with `rpc.schema`. This step customizes them in YAML.

```sh
npm run step:18
curl localhost:3000/ping
curl localhost:3000/healthz
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/operate-it
