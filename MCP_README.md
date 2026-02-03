# MCP GPT Codex Integration

This directory contains a custom MCP (Model Context Protocol) server that provides GPT Codex-like functionality for code generation, explanation, and debugging.

## Setup

### 1. VSCode Configuration
- MCP is enabled in `.vscode/settings.json`
- Server configuration is in `.vscode/mcp.json`

### 2. Environment Variables
Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your-openai-api-key-here
```

### 3. Available Tools
The MCP server provides three main tools:

#### `generate_code`
Generates code based on a description.
- **prompt**: Description of the code to generate (required)
- **language**: Programming language (default: typescript)

#### `explain_code`
Explains what a piece of code does.
- **code**: The code to explain (required)

#### `debug_code`
Helps debug code issues.
- **code**: The code with issues (required)
- **error**: The error message or description of the problem (optional)

## Usage

Once MCP is connected in your IDE, you can use these tools through the MCP interface to:
- Generate code snippets
- Get explanations of existing code
- Receive debugging suggestions

## Files

- `mcp-gpt-codex-server.ts` - TypeScript source of the MCP server
- `mcp-gpt-codex-server.cjs` - Compiled CommonJS version for execution
- `.vscode/mcp.json` - MCP server configuration
- `.vscode/settings.json` - VSCode MCP settings

## Testing

Test the server manually:
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node mcp-gpt-codex-server.cjs
```

## Notes

- This is a mock implementation that provides structured responses
- For production use, integrate with actual OpenAI API calls
- The server runs on stdio and communicates via JSON-RPC 2.0
