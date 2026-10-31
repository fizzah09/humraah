import { describe, expect, it } from 'vitest';
import { checkContact } from '@/lib/banks/directory';
import { decryptWith, deriveKey, encryptWith, randomSalt } from '@/lib/storage';
import { checkMessage } from '@/lib/scam/rules';

describe('official contact check', () => {
  it('recognises verified helplines and caller IDs', () => {
    expect(checkContact('111-111-425')).toMatchObject({ status: 'official', bank: { id: 'hbl' } });
    expect(checkContact('021 111 627 627')).toMatchObject({ status: 'official', bank: { id: 'nbp' } });
    expect(checkContact('1222')).toMatchObject({ status: 'official', bank: { id: 'abl' } });
  });
  it('flags personal mobiles and lookalike domains', () => {
    expect(checkContact('0301-1234567').status).toBe('personal_mobile');
    expect(checkContact('support@hbl-verify.com').status).toBe('lookalike');
    expect(checkContact('http://meezanbank.com.secure-login.xyz').status).toBe('lookalike');
    expect(checkContact('alerts@gmail.com').status).toBe('personal_mobile');
  });
  it('accepts official domains and subdomains only by exact suffix', () => {
    expect(checkContact('customer.care@hbl.com')).toMatchObject({ status: 'official', bank: { id: 'hbl' } });
    expect(checkContact('https://www.ubldigital.com/More/ContactUs').status).toBe('official');
    expect(checkContact('https://fakehbl.com').status).toBe('lookalike');
  });
  it('flags a bank message from a mobile number', () => {
    expect(checkMessage('Your HBL account is blocked', '03001234567').senderMismatch).toBe(true);
  });
});

describe('device encryption', () => {
  it('round-trips with the right code and fails with the wrong one', async () => {
    const salt = randomSalt();
    const k = await deriveKey('1-4-7-2', salt, 1000);
    const ct = await encryptWith(k, { ledger: [1, 2, 3] });
    expect(await decryptWith(k, ct)).toEqual({ ledger: [1, 2, 3] });
    const wrong = await deriveKey('1-4-7-3', salt, 1000);
    await expect(decryptWith(wrong, ct)).rejects.toBeTruthy();
  });
});
