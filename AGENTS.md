# Coding Guidelines & Agent Harness Instructions

## Angular Development Guidelines

### Separate Component Files
When creating or refactoring Angular components:
- **Always separate TypeScript, HTML, and CSS into distinct files**:
  - TypeScript logic: `*.component.ts` (or `*.ts`)
  - HTML template: `*.component.html` (or `*.html`)
  - CSS styles: `*.component.css` (or `*.css`)
- **Use `templateUrl` and `styleUrl`**:
  - Always link the template using `templateUrl: './<name>.html'` (or `./<name>.component.html`).
  - Always link the stylesheet using `styleUrl: './<name>.css'` (or `./<name>.component.css`).
- **Prohibited**:
  - Do NOT use inline templates (`template: \`...\``).
  - Do NOT use inline styles (`styles: [\`...\`]`).
