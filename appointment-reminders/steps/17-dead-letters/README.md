# Step 17 – Dead letters

Records the pipelines can't process are kept with their input and error.

```sh
yarn step:17
curl -X POST localhost:3000/data/deadLetters
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/dead-letters
