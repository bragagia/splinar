module.exports = {
  apps: [
    {
      name: "similarities-batch-eval",
      script: "./workers/similarities-batch-eval-init.tsx",
      args: "",
      interpreter: "/opt/homebrew/bin/tsx",
      interpreter_args: "--watch",
      time: true,
      instances: 4,

      env: {
        NODE_ENV: "development",

        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",

        HUBSPOT_CLIENT_ID: "1e3368cb-a326-4217-943d-0f9a14a91f07",
        HUBSPOT_SECRET: "ac5adc6f-f597-45b9-bbc2-f42df06d598c",

        REDIS_URL: "localhost:6379",
        REDIS_USE_TLS: "false",
        REDIS_PASSWORD: "",
        REDIS_BYPASS_TLS: "false",
      },
    },
    {
      name: "workspace-install",
      script: "./workers/workspace-install-init.tsx",
      args: "",
      interpreter: "/opt/homebrew/bin/tsx",
      interpreter_args: "--watch",
      time: true,
      instances: 1,

      env: {
        NODE_ENV: "development",

        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",

        HUBSPOT_CLIENT_ID: "1e3368cb-a326-4217-943d-0f9a14a91f07",
        HUBSPOT_SECRET: "ac5adc6f-f597-45b9-bbc2-f42df06d598c",

        REDIS_URL: "localhost:6379",
        REDIS_USE_TLS: "false",
        REDIS_PASSWORD: "",
        REDIS_BYPASS_TLS: "false",
      },
    },
    {
      name: "bull-board",
      script: "./workers/bull-board.tsx",
      args: "",
      interpreter: "/opt/homebrew/bin/tsx",
      interpreter_args: "",
      time: true,
      instances: 1,

      env: {
        NODE_ENV: "development",

        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",

        HUBSPOT_CLIENT_ID: "1e3368cb-a326-4217-943d-0f9a14a91f07",
        HUBSPOT_SECRET: "ac5adc6f-f597-45b9-bbc2-f42df06d598c",

        REDIS_URL: "localhost:6379",
        REDIS_USE_TLS: "false",
        REDIS_PASSWORD: "",
        REDIS_BYPASS_TLS: "false",
      },
    },
  ],
};
