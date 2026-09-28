# Step 10 – GraphQL

A complete GraphQL API generated from the ontology – YAML only.

```sh
yarn step:10
curl -X POST localhost:3000/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ customers { elements { name appointments { totalCount } } } }"}'
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/graphql
