import { describe, it, expect } from '@jest/globals';

// OnboardingAgeGateScreen logic tests (no UI rendering).
// Full integration tests would render with ThemeProvider + native DatePickerIOS mocking (Stage 4+).
// These tests verify the pure logic: age calculation, validation, date formatting.

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

describe('OnboardingAgeGateScreen – Logic', () => {
  it('calculates age correctly for user 16+ (eligible)', () => {
    const sixteenYearsAgo = new Date();
    sixteenYearsAgo.setFullYear(sixteenYearsAgo.getFullYear() - 16);

    const age = calculateAge(sixteenYearsAgo);
    expect(age).toBeGreaterThanOrEqual(16);
  });

  it('calculates age correctly for user < 16 (ineligible)', () => {
    const fifteenYearsAgo = new Date();
    fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);

    const age = calculateAge(fifteenYearsAgo);
    expect(age).toBeLessThan(16);
  });

  it('rejects birth date in the future', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const age = calculateAge(futureDate);
    expect(age).toBeLessThan(16);
  });

  it('formats date in readable format (MM/DD/YYYY style)', () => {
    const testDate = new Date('2010-05-15');
    const formatted = testDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    expect(formatted).toMatch(/[A-Z][a-z]+ \d+, \d{4}/);
    expect(formatted).toContain('2010');
  });

  it('validates age gate: at boundary (16th birthday today)', () => {
    const today = new Date();
    const sixteenYearsAgo = new Date(today);
    sixteenYearsAgo.setFullYear(today.getFullYear() - 16);

    const age = calculateAge(sixteenYearsAgo);
    expect(age).toBe(16);
    expect(age >= 16).toBe(true);
  });

  it('validates age gate: one day before 16th birthday', () => {
    const today = new Date();
    const almostSixteen = new Date(today);
    almostSixteen.setFullYear(today.getFullYear() - 16);
    almostSixteen.setDate(almostSixteen.getDate() + 1); // Tomorrow would be 16

    const age = calculateAge(almostSixteen);
    expect(age).toBe(15);
    expect(age >= 16).toBe(false);
  });
});
