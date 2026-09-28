# Step 21 – Discovery

The code is identical to step 20. `remotes` is gone: the notifications process registers itself in a registry,
and the appointments process looks services up there.

```sh
npm run step:21:registry        # terminal 1
npm run step:21:notifications   # terminal 2
npm run step:21:appointments    # terminal 3
curl -X POST localhost:3100/.registry/list
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/discovery
