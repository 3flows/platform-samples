# Step 22 – Discovery

The code is identical to step 21. `remotes` is gone: the notifications process registers itself in a registry,
and the appointments process looks services up there.

```sh
yarn step:22:registry        # terminal 1
yarn step:22:notifications   # terminal 2
yarn step:22:appointments    # terminal 3
curl -X POST localhost:3100/.registry/list
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/discovery
