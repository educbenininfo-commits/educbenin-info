import { describe, it, expect } from 'vitest';
import { formatWhatsapp, whatsappLink } from './contact-display';

describe('formatWhatsapp', () => {
  it('groups a valid number the libphonenumber way', () => {
    expect(formatWhatsapp('+2290167249837')).toBe('+229 01 67 24 98 37');
  });

  it('groups a legacy 8-digit Bénin number in pairs', () => {
    expect(formatWhatsapp('+22967249837')).toBe('+229 67 24 98 37');
  });

  it('returns unparseable input unchanged', () => {
    expect(formatWhatsapp('n/a')).toBe('n/a');
  });
});

describe('whatsappLink', () => {
  it('strips everything but digits and encodes the prefilled text', () => {
    expect(whatsappLink('+229 67 24 98 37', 'Bonjour Educ Bénin')).toBe(
      'https://wa.me/22967249837?text=Bonjour%20Educ%20B%C3%A9nin',
    );
  });
});
