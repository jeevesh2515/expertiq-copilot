import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // KnowledgeGraphViz drives a Three.js render loop with imperative
    // canvas state; the strict react-hooks/immutability rule (new in
    // eslint-config-next) flags that pattern wholesale. Downgrade to warn
    // for this file until it gets a dedicated refactor.
    files: ["src/components/KnowledgeGraphViz.tsx"],
    rules: {
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
