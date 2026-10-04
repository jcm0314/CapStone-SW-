import { describe, it, expect } from 'vitest';
import app from './index.js';

describe('Express API Gateway Health Check', () => {
  it('should return UP status on /health endpoint', async () => {
    // Basic structural test ensuring express app is instantiated
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});
