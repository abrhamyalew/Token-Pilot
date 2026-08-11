import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  it('closes the postgres client on module destroy', async () => {
    const client = { end: vi.fn().mockResolvedValue(undefined) };

    await new DatabaseModule(client as any).onModuleDestroy();

    expect(client.end).toHaveBeenCalledWith({ timeout: 5 });
  });

  it('swallows database close errors during shutdown', async () => {
    const client = { end: vi.fn().mockRejectedValue(new Error('close failed')) };

    await expect(new DatabaseModule(client as any).onModuleDestroy()).resolves.toBeUndefined();
  });
});
