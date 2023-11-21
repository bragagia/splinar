## Splinar

NextJs development server:

```bash
npm run dev
```

Workers:

```bash
NODE_ENV=development npx tsx workers/workspace-install.tsx
```

or

```bash
pm2 start npx -i 0 -- tsx workers/workspace-install.tsx
```

`-i 0` tell to scale to as many cpu as possible
