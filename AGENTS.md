# Coding Guidelines & Agent Harness Instructions

## Angular Development Guidelines

### Separate Component Files & SCSS Usage
When creating or refactoring Angular components:
- **Always separate TypeScript, HTML, and SCSS into distinct files**:
  - TypeScript logic: `*.component.ts` (or `*.ts`)
  - HTML template: `*.component.html` (or `*.html`)
  - Stylesheet: `*.component.scss` (or `*.scss`) — **Always use SCSS instead of CSS**.
- **Use `templateUrl` and `styleUrl`**:
  - Always link the template using `templateUrl: './<name>.html'` (or `./<name>.component.html`).
  - Always link the stylesheet using `styleUrl: './<name>.scss'` (or `./<name>.component.scss`).
- **Prohibited**:
  - Do NOT use plain `.css` files for Angular components; always use `.scss`.
  - Do NOT use inline templates (`template: \`...\``).
  - Do NOT use inline styles (`styles: [\`...\`]`).

