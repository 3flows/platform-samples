# Step 13 – An assistant through MCP

An MCP server for a reception assistant: two chosen handlers as tools, plus the ontology. YAML only.

```sh
yarn step:13
curl -X POST localhost:3000/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/mcp
