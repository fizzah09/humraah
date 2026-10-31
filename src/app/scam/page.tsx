'use client';
import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import { Button, Card, Field, Input, Notice, PageHeader, TextArea } from '@/components/ui';
import { T } from '@/components/LangProvider';
import { checkMessage, VERDICT_TEXT, type ScamResult } from '@/lib/scam/rules';
import ContactCheck from '@/components/ContactCheck';
import { logActivity } from '@/lib/activity';

const EXAMPLE = 'URGENT: Your Meezan Bank account will be blocked within 24 hours. Verify now at http://meezan-verify.xyz/login and share the OTP sent to you. Call 0301-1234567.';

function Highlighted({ text, result }: { text: string; result: ScamResult }) {
  const parts: React.ReactNode[] = [];
  let i = 0;
  const hits = [...result.hits].sort((a, b) => a.index - b.index).filter((h, k, arr) => k === 0 || h.index >= arr[k - 1].index + arr[k - 1].match.length);
  hits.forEach((h, k) => {
    if (h.index > i) parts.push(text.slice(i, h.index));
    parts.push(<mark key={k} className="flag" title={h.title}>{text.slice(h.index, h.index + h.match.length)}</mark>);
    i = h.index + h.match.length;
  });
  parts.push(text.slice(i));
  return <p className="whitespace-pre-wrap leading-8 bg-surfaceAlt rounded-xl p-4 border border-border">{parts}</p>;
}

export default function ScamPage() {
  const [text, setText] = useState('');
  const [sender, setSender] = useState('');
  const [result, setResult] = useState<ScamResult | null>(null);
  const [checked, setChecked] = useState('');

  const run = (t = text) => {
    const r = checkMessage(t, sender);
    setChecked(t); setResult(r);
    logActivity('Fraud check', 'action', `Ek message check kiya: "${t.slice(0, 120)}${t.length > 120 ? '…' : ''}". Natija: ${VERDICT_TEXT[r.verdict].roman}.`);
  };

  const tone = result?.verdict === 'likely_scam' ? 'danger' : result?.verdict === 'suspicious' ? 'warning' : 'success';
  const v = result ? VERDICT_TEXT[result.verdict] : null;

  const share = async () => {
    const msg = `⚠ Humraah warning: yeh message dhoka lagta hai. Is ke link par click na karein, OTP/PIN kisi ko na batayein. Bank ko sirf card ke peechay likhe number par call karein.\n\n"${checked.slice(0, 200)}"`;
    if (navigator.share) { try { await navigator.share({ text: msg }); return; } catch { /* cancelled */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Fraud check" urdu="مشکوک پیغام؟ پہلے یہاں چیک کریں" subtitle="SMS / WhatsApp message paste karein ya screenshot upload karein. Message aap ke phone par hi check hota hai, kahin bheja nahi jata." />
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <Field label="Message text"><TextArea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message yahan paste karein…" /></Field>
          <Field label="Kis ne bheja? (sender ID / number, optional)"><Input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="03xx… ya bank ka naam" /></Field>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => run()} disabled={!text.trim()}>Check karein</Button>
            <Button variant="ghost" onClick={() => { setText(EXAMPLE); setSender('03011234567'); }}>Example</Button>
          </div>
        </Card>
        <Card>
          <p className="font-bold mb-2">Ya screenshot upload karein</p>
          <ImageUpload feature="Fraud check" withOcr label="SMS / WhatsApp screenshot" onImage={(img) => { const t = img.ocr?.text?.trim() ?? ''; setText(t); if (t) run(t); }} />
        </Card>
      </div>

      <Card>
        <p className="font-bold text-lg mb-1">Call, SMS number, email ya website asli hai?</p>
        <p className="text-inkMuted text-[16px] mb-3">HBL, UBL, MCB, Meezan, NBP aur ABL ke official numbers aur websites se milata hai.</p>
        <ContactCheck />
      </Card>

      {result && v && (
        <div className="space-y-4">
          <Notice tone={tone}>
            <p className="text-2xl font-bold">{v.en}</p>
            <T ur={v.ur} roman={v.roman} className="text-lg" />
          </Notice>
          <Card>
            <p className="font-bold mb-2">Message (laal = khatray ki nishani)</p>
            <Highlighted text={checked} result={result} />
          </Card>
          {(result.hits.length > 0 || result.senderMismatch) && (
            <Card>
              <p className="font-bold mb-3">Red flags</p>
              <ul className="space-y-3">
                {[...new Map(result.hits.map((h) => [h.rule, h])).values()].map((h) => (
                  <li key={h.rule} className="flex gap-3">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-dangerBg text-danger grid place-items-center font-bold">!</span>
                    <div>
                      <p className="font-semibold">{h.title}: <mark className="flag">{h.match}</mark></p>
                      <T ur={h.explainUr} roman={h.explainRoman} className="text-inkSecondary" />
                    </div>
                  </li>
                ))}
                {result.senderMismatch && (
                  <li className="flex gap-3">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-dangerBg text-danger grid place-items-center font-bold">!</span>
                    <div><p className="font-semibold">Sender bank ka official ID nahi lagta</p><p className="text-inkSecondary">Bank ke baare mein message ek aam mobile number (03xx) se aaya hai. Bank aise message aam number se nahi bhejte.</p></div>
                  </li>
                )}
              </ul>
            </Card>
          )}
          <Card className="bg-surfaceAlt">
            <p className="font-bold mb-2">Ab kya karein?</p>
            <ol className="list-decimal ps-5 space-y-1 text-inkSecondary">
              <li>Message ke link par <b>click na karein</b> aur reply na karein.</li>
              <li>Apni bank app <b>khud kholein</b> aur wahan check karein.</li>
              <li>Sirf <b>card ke peechay likhe number</b> par bank ko call karein. Message wala number kabhi nahi.</li>
              <li>OTP, PIN ya CNIC kisi ko na batayein. Bank ko report karein.</li>
            </ol>
            <p className="font-urdu mt-2 text-inkSecondary" dir="rtl">ہم کسی پیغام کو "محفوظ" نہیں کہہ سکتے۔ ہمیشہ اپنی ایپ سے تصدیق کریں۔</p>
            <Button className="mt-3" onClick={share}>📣 Family ko khabardar karein</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
