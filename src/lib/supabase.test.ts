import { describe, it, expect, vi } from 'vitest';
import { DatabaseService, db } from './supabase';

describe('DatabaseService', () => {
    it('should be a singleton', () => {
        const instance1 = DatabaseService.getInstance();
        const instance2 = DatabaseService.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should export a default db instance', () => {
        expect(db).toBeDefined();
        expect(db).toBeInstanceOf(DatabaseService);
    });
});
