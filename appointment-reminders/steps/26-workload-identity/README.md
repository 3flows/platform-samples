# Step 26 – Workload identity

Notifications only accepts calls with a signed workload token. The appointments process signs every call, with a key from the vault. YAML only.

```sh
yarn step:26:registry        # terminal 1
yarn step:26:notifications   # terminal 2
yarn step:26:appointments    # terminal 3
curl -i -X POST localhost:3001/outbox   # 401: no token
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/workload-identity
