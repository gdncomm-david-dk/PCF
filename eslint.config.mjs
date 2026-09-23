import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
    { ignores: ["out/**", "node_modules/**", "harness/**", "solution/**", "**/generated/**"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["ApprovalUIManagement/**/*.{ts,tsx}", "MarketingSlotCalendar/**/*.{ts,tsx}"],
        plugins: { "react-hooks": reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
        }
    }
);
