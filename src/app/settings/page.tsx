'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Notice, PageHeader } from '@/components/ui';
import { deleteAll, deleteData, exportAll, lastSyncError } from '@/lib/storage';
import { currentUid, deleteVault, firebaseEnabled, logOut, wipeRemote } from '@/lib/cloud';
import { lockNow } from '@/components/AuthGate';

export default function SettingsPage() {
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { setSync(lastSyncError()); if (firebaseEnabled) currentUid().then(setUid).catch(() => {}); }, []);

  const removeData = async () => {
    if (!confirm(uid ? 'Sara data is phone aur cloud dono se delete karein? Login (Tasveer Code) rahega.' : 'Sara data delete karein? Login (Tasveer Code) rahega.')) return;
    setBusy(true);
    try {
      if (uid) await deleteVault(uid);
      deleteData();
      setDone(uid ? 'Sara data phone aur cloud se delete ho gaya. Tasveer Code wohi hai.' : 'Sara data delete ho gaya. Tasveer Code wohi hai.');
    } catch {
      setDone('Cloud se delete nahi hua (internet check karein). Phone ka data abhi bhi mehfooz hai, dobara koshish karein.');
    } finally { setBusy(false); }
  };
  const removeAll = async () => {
    if (!confirm('Sab kuch, Tasveer Code samait, delete karein? Yeh wapas nahi aayega.')) return;
    setBusy(true);
    try {
      if (uid) { await wipeRemote(uid); await logOut(); }
      deleteAll();
      location.reload();
    } catch {
      setBusy(false);
      setDone('Cloud se delete nahi hua (internet check karein). Kuch delete nahi kiya gaya, dobara koshish karein.');
    }
  };
  const signOut = async () => { lockNow(); await logOut(); location.reload(); };
  const download = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'humraah-data.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Hifazat aur data" urdu="آپ کا ڈیٹا، آپ کی مرضی" />
      <Card className="space-y-2">
        <p className="font-bold">Hum kya rakhte hain, aur kaise</p>
        <ul className="list-disc ps-5 text-inkSecondary space-y-1">
          <li>Kharcha diary, bills, statement ki lines, zakat, sauda aur history: {firebaseEnabled ? <>is phone par, aur Google login ho to <b>cloud (Firebase) mein bhi</b>, dono jagah <b>taale (AES-256 encryption) mein</b>. Cloud par sirf taala-band data jata hai; taala (Tasveer Code) sirf aap ke paas hai.</> : <><b>sirf is phone par</b>, <b>taale (AES-256 encryption) mein</b>. Taala aap ka Tasveer Code hai.</>}</li>
          <li>App 5 minute kuch na karne par khud lock ho jati hai. 5 ghalat koshishon ke baad intezar karna parta hai.</li>
          <li>Tasveerein <b>save nahi hotin</b>. Saathi wali tasveer 2 minute baad screen se bhi delete; baqi foran. Sirf tafseel (size, waqt, AI ko gayi ya nahi) <Link className="underline" href="/history">history</Link> mein.</li>
          <li>Account aur card numbers aakhri 4 digits tak chhupa diye jatay hain. PIN, password, OTP, CNIC kabhi save nahi hotay.</li>
          <li>Screenshot Google Gemini (AI) ko sirf tab jata hai jab server par Gemini key lagi ho; history mein har tasveer ke saath likha hota hai ke AI ko gayi ya nahi.</li>
        </ul>
      </Card>
      {firebaseEnabled && (
        <Notice tone={sync ? 'warning' : 'success'}>
          {uid ? (sync ?? 'Cloud backup chal raha hai. Naye phone par isi Google account aur Tasveer Code se data wapas mil jayega.') : 'Google login nahi hai, data sirf is phone par hai.'}
        </Notice>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <Button onClick={lockNow}>🔒 Abhi lock karein</Button>
        {uid && <Button variant="secondary" onClick={signOut}>Google account se logout</Button>}
        <Link href="/banks"><Button variant="secondary" className="w-full">Mera bank badlein</Button></Link>
        <Link href="/history"><Button variant="ghost" className="w-full">Meri history dekhein</Button></Link>
        <Button variant="ghost" onClick={download}>Mera data export karein</Button>
        <Button variant="danger" disabled={busy} onClick={removeData}>Data delete karein</Button>
        <Button variant="danger" disabled={busy} onClick={removeAll}>Sab kuch delete (naya shuru)</Button>
      </div>
      {done && <Notice tone="success">{done}</Notice>}
      <Notice tone="warning">Humraah koi bank nahi hai aur kisi bank se mansoob nahi. Hum paise nahi bhejtay aur aap ke bank account mein login nahi karte. Shak ho to card ke peechay likhe helpline number par call karein.</Notice>
    </div>
  );
}
