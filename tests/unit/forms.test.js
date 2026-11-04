import { activeFilterCount, applyTaskFilters, DEFAULT_FILTERS, isFiltering } from '../../lib/taskFilters';
import { validate } from '../../lib/validation';

const tasks = [
  { title: 'Fold laundry', monetaryValue: 2, effortRating: 3 },
  { title: 'Café run', monetaryValue: 0.5, effortRating: 1 },
  { title: 'Practice exam', monetaryValue: 8, effortRating: 5 },
  { title: 'Make bed', monetaryValue: 0.5, effortRating: 1 },
];
const f = (over) => ({ ...DEFAULT_FILTERS, ...over });

describe('applyTaskFilters', () => {
  test('every search word must appear, ignoring case and accents', () => {
    expect(applyTaskFilters(tasks, f({ query: 'fold LAU' })).map((t) => t.title)).toEqual(['Fold laundry']);
    expect(applyTaskFilters(tasks, f({ query: 'cafe' })).map((t) => t.title)).toEqual(['Café run']);
  });

  test('effort and value filters combine', () => {
    const out = applyTaskFilters(tasks, f({ efforts: [1, 3], minValue: 1 }));
    expect(out.map((t) => t.title)).toEqual(['Fold laundry']);
  });

  test('sorts are stable, so ties keep newest-first order', () => {
    const out = applyTaskFilters(tasks, f({ sort: 'valueAsc' }));
    expect(out.map((t) => t.title)).toEqual(['Café run', 'Make bed', 'Fold laundry', 'Practice exam']);
  });

  test('never mutates the input', () => {
    const copy = [...tasks];
    applyTaskFilters(tasks, f({ sort: 'valueDesc' }));
    expect(tasks).toEqual(copy);
  });

  test('search alone counts as filtering but not as an active filter', () => {
    expect(isFiltering(f({ query: 'x' }))).toBe(true);
    expect(activeFilterCount(f({ query: 'x' }))).toBe(0);
    expect(activeFilterCount(f({ efforts: [2], maxValue: 3 }))).toBe(2);
  });
});

describe('validate (spec §5 copy)', () => {
  test('task title', () => {
    expect(validate.taskTitle('   ')).toBe('Give your task a name.');
    expect(validate.taskTitle('x'.repeat(81))).toBe('Keep it under 80 characters.');
    expect(validate.taskTitle('Fold laundry')).toBeNull();
  });

  test('task value', () => {
    expect(validate.taskValue('')).toBe('Enter an amount, like 1.50.');
    expect(validate.taskValue('-1')).toBe('Amount can’t be negative.');
    expect(validate.taskValue('1000')).toBe('Enter an amount, like 1.50.');
    expect(validate.taskValue('0')).toBeNull();
    expect(validate.taskValue('2,50')).toBeNull();
  });

  test('price must be positive', () => {
    expect(validate.price('0')).toBe('Enter the price, like 89.99.');
    expect(validate.price('89.99')).toBeNull();
  });

  test('allowance range', () => {
    expect(validate.allowance('0.5')).toBe('Enter a monthly amount, like 150.');
    expect(validate.allowance('10001')).toBe('Enter a monthly amount, like 150.');
    expect(validate.allowance('150')).toBeNull();
  });

  test('links and images', () => {
    expect(validate.productUrl('')).toBeNull();
    expect(validate.productUrl('', { required: true })).not.toBeNull();
    expect(validate.productUrl('shop.com')).not.toBeNull();
    expect(validate.imageUrl('local:abc.jpg')).toBeNull();
    expect(validate.imageUrl('https://x.com/a.jpg')).toBeNull();
    expect(validate.imageUrl('file:///etc')).not.toBeNull();
  });
});
