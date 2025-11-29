import { generateDerangement, generateAssignments } from '../derangement';

describe('generateDerangement', () => {
  it('should throw error for less than 2 items', () => {
    expect(() => generateDerangement([])).toThrow('Need at least 2 items');
    expect(() => generateDerangement(['a'])).toThrow('Need at least 2 items');
  });

  it('should generate valid derangement for 2 items', () => {
    const items = ['a', 'b'];
    const result = generateDerangement(items);

    // Check no self-assignments
    expect(result.get('a')).not.toBe('a');
    expect(result.get('b')).not.toBe('b');

    // Check all items are assigned
    expect(result.size).toBe(2);
  });

  it('should generate valid derangement for 3 items', () => {
    const items = ['a', 'b', 'c'];
    const result = generateDerangement(items);

    // Check no self-assignments
    for (const item of items) {
      expect(result.get(item)).not.toBe(item);
    }

    // Check all items are assigned
    expect(result.size).toBe(3);
  });

  it('should generate valid derangement for large group', () => {
    const items = Array.from({ length: 100 }, (_, i) => `participant-${i}`);
    const result = generateDerangement(items);

    // Check no self-assignments
    for (const item of items) {
      expect(result.get(item)).not.toBe(item);
    }

    // Check all items are assigned
    expect(result.size).toBe(100);
  });

  it('should never assign anyone to themselves (stress test)', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

    // Run 1000 times to ensure algorithm is reliable
    for (let run = 0; run < 1000; run++) {
      const result = generateDerangement(items);

      for (const item of items) {
        expect(result.get(item)).not.toBe(item);
      }
    }
  });

  it('should include all participants exactly once as assignees', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = generateDerangement(items);

    // Collect all assigned values
    const assignees = new Set(result.values());

    // Every original item should appear exactly once as an assignee
    expect(assignees.size).toBe(items.length);
    for (const item of items) {
      expect(assignees.has(item)).toBe(true);
    }
  });

  it('should form a single cycle (Sattolo property)', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = generateDerangement(items);

    // Starting from any item, following the chain should visit all items
    // and return to the start after exactly n steps
    const visited = new Set<string>();
    let current = items[0];

    for (let i = 0; i < items.length; i++) {
      visited.add(current);
      current = result.get(current)!;
    }

    // After n steps, we should be back at start and have visited everyone
    expect(current).toBe(items[0]);
    expect(visited.size).toBe(items.length);
  });
});

describe('generateAssignments', () => {
  it('should work with participant IDs', () => {
    const participantIds = [
      'uuid-1',
      'uuid-2',
      'uuid-3',
    ];

    const result = generateAssignments(participantIds);

    // Check no self-assignments
    for (const id of participantIds) {
      expect(result.get(id)).not.toBe(id);
    }

    expect(result.size).toBe(3);
  });
});
