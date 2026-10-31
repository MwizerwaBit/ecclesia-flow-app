import { describe, expect, it } from 'vitest';
import { toCamelCase, toSnakeCase } from './adapter';

describe('key casing', () => {
  it('renames field names both ways', () => {
    expect(toSnakeCase({ respondentName: 'A', nested: { fieldType: 'text' } })).toEqual({
      respondent_name: 'A',
      nested: { field_type: 'text' },
    });
    expect(toCamelCase({ respondent_name: 'A', list: [{ field_type: 'text' }] })).toEqual({
      respondentName: 'A',
      list: [{ fieldType: 'text' }],
    });
  });

  it('leaves what a person typed as an answer alone: the question wording is the key', () => {
    const answers = { Allergies: ['Nuts'], first_name: 'x', 'T-shirt size': 'M', Dietary_Notes: 'none' };
    expect(toSnakeCase({ respondentName: 'A', answers })).toEqual({ respondent_name: 'A', answers });
    expect(toCamelCase({ respondent_name: 'A', answers })).toEqual({ respondentName: 'A', answers });
  });
});
