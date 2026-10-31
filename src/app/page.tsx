'use client';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { Icon, NAV } from '@/components/Nav';
import { T } from '@/components/LangProvider';
import { useStored } from '@/lib/storage';

const TOOLS = [
  { href: '/sauda', ur: 'سودے کی لسٹ دیں، حساب سیکھیں', roman: 'Sauda ki list dein, hisaab seekhein' },
  { href: '/banks', ur: 'اپنے بینک کے اصلی نمبر اور ایپ کی رہنمائی', roman: 'Apne bank ke asli number aur app ki rehnumai' },
  { href: '/scam', ur: 'مشکوک SMS یا کال؟ پہلے یہاں چیک کریں', roman: 'Mashkook SMS ya call? Pehle yahan check karein' },
  { href: '/statement', ur: 'بینک نے پیسے کیوں کاٹے؟ ہر کٹوتی سمجھیں', roman: 'Bank ne paise kyun kaatay? Har katauti samjhein' },
  { href: '/ledger', ur: 'پیسے کس لیے نکالے؟ ابھی لکھ لیں', roman: 'Paise kis liye nikalay? Abhi likh lein' },
  { href: '/bills', ur: 'بل کی تاریخ کبھی نہ بھولیں', roman: 'Bill ki tareekh kabhi na bhoolein' },
  { href: '/zakat', ur: 'زکوٰۃ کا آسان حساب', roman: 'Zakat ka aasaan hisaab' },
  { href: '/fitra', ur: 'گھر کے ہر فرد کا فطرہ، حساب کے ساتھ', roman: 'Ghar ke har fard ka fitra, hisaab ke saath' },
  { href: '/history', ur: 'کیا کہا، کیا بتایا: سب ریکارڈ', roman: 'Kya kaha, kya bataya: sab record' },
];

const JOURNEY = [
  { n: 1, href: '/practice', title: 'Mashq', ur: 'نقلی ایپ پر بے خوف مشق کریں', roman: 'Naqli app par be-khauf mashq karein' },
  { n: 2, href: '/assistant', title: 'Saathi ke saath', ur: 'اپنی اصلی ایپ میں، ساتھی کی رہنمائی سے', roman: 'Apni asli app mein, Saathi ki rehnumai se' },
  { n: 3, href: '/practice', title: 'Khud', ur: 'اب خود کریں، کسی کو فون کیے بغیر', roman: 'Ab khud karein, kisi ko phone kiye baghair' },
];

export default function Home() {
  const [stored] = useStored<{ done?: string[] }>('practice', {});
  const practice = { done: stored.done ?? [] };
  return (
    <div className="space-y-8">
      <section className="rounded-[28px] bg-primary text-white p-6 sm:p-10 grid md:grid-cols-[1.4fr_1fr] gap-6 items-center">
        <div>
          <p className="font-urdu text-2xl sm:text-3xl leading-[2.4] pb-2 mb-2" dir="rtl">بینک ایپ سے ڈر لگتا ہے؟ کوئی بات نہیں۔</p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Apni bank app khud chalana seekhein.</h1>
          <p className="mt-3 text-primaryTint text-lg">Hum aap ki jagah kaam nahi karte. Hum har qadam samjhatay hain, taa ke agli baar aap khud kar sakein.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={practice.done.length ? '/assistant' : '/practice'} className="inline-flex items-center gap-3 bg-white text-primaryDark font-bold rounded-2xl px-6 min-h-[56px] text-lg hover:bg-primaryTint">
              <Icon d={NAV[practice.done.length ? 1 : 2].icon} size={26} /> {practice.done.length ? 'Saathi se poochein' : 'Pehli dafa? Mashq se shuru karein'}
            </Link>
            {practice.done.length > 0 && <Link href="/practice" className="inline-flex items-center px-5 min-h-[56px] rounded-2xl border-2 border-white/60 font-semibold hover:bg-primaryDark">Mashq ({practice.done.length} seekh liye)</Link>}
          </div>
        </div>
        <ol className="space-y-3" aria-label="Seekhne ka raasta">
          {JOURNEY.map((j) => (
            <li key={j.n}>
              <Link href={j.href} className="flex items-center gap-4 rounded-2xl bg-primaryDark/60 hover:bg-primaryDark p-4">
                <span className="h-11 w-11 shrink-0 rounded-full bg-white text-primaryDark grid place-items-center font-bold text-xl">{j.n}</span>
                <span><span className="block font-bold text-lg">{j.title}</span><T ur={j.ur} roman={j.roman} className="text-primaryTint text-[16px]" /></span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ink mb-3">Rozmarra ki madad</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((f) => {
            const nav = NAV.find((n) => n.href === f.href)!;
            return (
              <Link key={f.href} href={f.href} className="group">
                <Card className="h-full group-hover:border-primary transition-colors flex gap-4 items-start">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-primaryTint text-primary grid place-items-center"><Icon d={nav.icon} size={28} /></div>
                  <div>
                    <p className="font-bold text-ink text-xl">{nav.label}</p>
                    <T ur={f.ur} roman={f.roman} className="text-inkSecondary" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl2 border border-border bg-surfaceAlt p-5 sm:p-6">
        <p className="font-urdu text-xl text-primaryDark" dir="rtl">ہمارے تین وعدے</p>
        <div className="grid sm:grid-cols-3 gap-4 mt-2">
          {[
            ['Kabhi PIN/OTP nahi maangtay', 'Jo bhi OTP maange, chahe bank ka naam le, woh dhokebaaz hai.'],
            ['Paise kabhi nahi chhootay', 'Har qadam aap apni app mein khud karte hain. Hum sirf batatay hain.'],
            ['Tasveer save nahi hoti', 'Screenshot kaam ke baad delete. Pehle naam aur number blur kar sakte hain.'],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-bold text-ink">✓ {t}</p>
              <p className="text-inkSecondary text-[16px]">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
