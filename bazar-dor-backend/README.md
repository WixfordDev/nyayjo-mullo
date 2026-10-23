# Initial setup 

## Seed commands

Run from `bazar-dor-backend/`:

```bash
npm run seed:bazars        # seed Bangladesh bazars into the DB set in MONGODB_URL
npm run seed:bazars:dry    # dry run — logs what would be inserted, writes nothing
npm run seed:market-index  # seed market index prices
npm run seed                # run src/utils/seeder.ts
```
