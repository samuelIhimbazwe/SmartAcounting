import {
  schemaMigrations,
  createTable,
  addColumns,
} from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'offline_transactions',
          columns: [
            {name: 'operation_type', type: 'string', isOptional: true},
            {name: 'last_error', type: 'string', isOptional: true},
          ],
        }),
      ],
    },
  ],
});
