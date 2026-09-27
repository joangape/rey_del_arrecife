# Angular Component Structure Rules

- **Always separate TypeScript, HTML, and CSS**:
  - Every Angular component must have its logic in a `.ts` file, markup in a `.html` file, and styling in a `.css` file.
  - Link them in `@Component({ ... })` using `templateUrl: './<component>.html'` and `styleUrl: './<component>.css'`.
  - Never use inline templates (`template: ...`) or inline styles (`styles: [...]`).
