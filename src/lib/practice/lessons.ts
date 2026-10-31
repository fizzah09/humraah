/**
 * Practice lessons on a FAKE bank app ("Mashq Bank"). No real money, no real bank.
 * Every button carries a plain explanation, so a wrong tap teaches instead of punishing.
 */
export interface SimButton { id: string; label: string; explain: string; icon?: string }

export type SimStep =
  | { kind: 'tap'; screen: string; header?: string; body?: string[]; buttons: SimButton[]; correct: string; coach: string; coachUr: string; why: string }
  | { kind: 'input'; screen: string; header?: string; body?: string[]; label: string; expected: string; coach: string; coachUr: string; why: string; hint: string }
  | { kind: 'quiz'; screen: string; header?: string; body?: string[]; popup?: { from: string; text: string }; question: string; options: { text: string; correct: boolean; feedback: string }[]; coach: string; coachUr: string; why: string };

export interface Lesson { id: string; title: string; titleUr: string; minutes: number; steps: SimStep[]; recap: string[] }

const HOME_BUTTONS: SimButton[] = [
  { id: 'accounts', label: 'Accounts', icon: '🏦', explain: '"Accounts" mein aap ka balance aur account ki details hoti hain.' },
  { id: 'transfer', label: 'Fund Transfer', icon: '💸', explain: '"Fund Transfer" se kisi ko paise bhejtay hain.' },
  { id: 'bills', label: 'Bill Payment', icon: '🧾', explain: '"Bill Payment" se bijli, gas, paani ke bill ada hotay hain.' },
  { id: 'cards', label: 'Cards', icon: '💳', explain: '"Cards" mein ATM card band ya chalu karte hain.' },
  { id: 'logout', label: 'Logout', icon: '⏻', explain: '"Logout" app se bahar nikal deta hai. Koi nuqsaan nahi, dobara login kar sakte hain.' },
];

export const LESSONS: Lesson[] = [
  {
    id: 'balance',
    title: 'Balance dekhna',
    titleUr: 'بیلنس دیکھنا',
    minutes: 1,
    steps: [
      { kind: 'tap', screen: 'Home', header: 'Assalam-o-Alaikum, Nasreen', buttons: HOME_BUTTONS, correct: 'accounts', coach: '"Accounts" dhoondein aur us par tap karein.', coachUr: '"Accounts" ڈھونڈیں اور اس پر ٹیپ کریں۔', why: 'Balance hamesha "Accounts" ke andar hota hai, har bank app mein.' },
      { kind: 'quiz', screen: 'Accounts', header: 'My Accounts', body: ['Current Account  •••• 4821', 'Available Balance', 'PKR 52,000.00', 'Ledger Balance  PKR 52,500.00'], question: 'Aap kitne paise abhi nikal ya bhej sakte hain?', options: [
        { text: 'PKR 52,000 (Available Balance)', correct: true, feedback: 'Bilkul sahi! "Available Balance" woh raqam hai jo abhi istemal ho sakti hai.' },
        { text: 'PKR 52,500 (Ledger Balance)', correct: false, feedback: '"Ledger Balance" mein woh paise bhi hotay hain jo abhi clear nahi huay. Istemal ke liye "Available Balance" dekhein.' },
      ], coach: 'Ghaur se dekhein: do balance likhe hain.', coachUr: 'غور سے دیکھیں: دو بیلنس لکھے ہیں۔', why: 'Bank app mein aksar 2 balance hotay hain. Kaam ka "Available" wala hai.' },
    ],
    recap: ['App khol kar "Accounts" par tap kiya.', '"Available Balance" hi asal kharch hone wali raqam hai.', 'Ab apni asli app mein yahi 2 qadam khud karein.'],
  },
  {
    id: 'send',
    title: 'Beta ko paise bhejna',
    titleUr: 'بیٹے کو پیسے بھیجنا',
    minutes: 3,
    steps: [
      { kind: 'tap', screen: 'Home', header: 'Assalam-o-Alaikum, Nasreen', buttons: HOME_BUTTONS, correct: 'transfer', coach: 'Paise bhejne ke liye "Fund Transfer" par tap karein.', coachUr: 'پیسے بھیجنے کے لیے "Fund Transfer" پر ٹیپ کریں۔', why: '"Transfer" ka matlab hai paise ek jagah se doosri jagah bhejna.' },
      { kind: 'tap', screen: 'Fund Transfer', header: 'Fund Transfer', buttons: [
        { id: 'saved', label: 'Saved Beneficiary', icon: '⭐', explain: '"Saved Beneficiary" woh log hain jin ko aap pehle paise bhej chuke hain. Sab se mehfooz tareeqa.' },
        { id: 'new', label: 'New Transfer', icon: '➕', explain: '"New Transfer" naye shakhs ke liye hai. Account number khud likhna parta hai, ghalti ka khatra zyada.' },
        { id: 'raast', label: 'Raast ID', icon: '📱', explain: '"Raast" mobile number se paise bhejne ka sarkari nizaam hai.' },
      ], correct: 'saved', coach: 'Beta pehle se save hai. "Saved Beneficiary" chunein.', coachUr: 'بیٹا پہلے سے محفوظ ہے۔ "Saved Beneficiary" چنیں۔', why: '"Beneficiary" ka matlab: jis ko paise milenge. Saved wale mein account number ghalat hone ka khatra nahi.' },
      { kind: 'tap', screen: 'Saved Beneficiary', header: 'Select Beneficiary', buttons: [
        { id: 'ahmed', label: 'Ahmed Ali (Beta)', icon: '👤', explain: 'Yeh aap ka beta hai.' },
        { id: 'ahmad', label: 'Ahmad Electronics', icon: '🏪', explain: 'Dhyan! Yeh naam milta julta hai lekin yeh ek dukaan hai. Naam hamesha poora parhein.' },
        { id: 'sara', label: 'Sara Khan', icon: '👤', explain: 'Yeh Sara hain, beta nahi.' },
      ], correct: 'ahmed', coach: 'Apne betay "Ahmed Ali" ka naam dhoondein. Milte julte naam se bachein.', coachUr: 'اپنے بیٹے "Ahmed Ali" کا نام ڈھونڈیں۔ ملتے جلتے نام سے بچیں۔', why: 'Ghalat shakhs ko paise chalay jayein to wapas lena mushkil hota hai. Naam poora parhein.' },
      { kind: 'input', screen: 'Amount', header: 'Ahmed Ali (Beta)', body: ['Meezan Bank •••• 7731'], label: 'Amount (PKR)', expected: '5000', hint: 'Sirf 5000 likhein: 5, 0, 0, 0. Comma ya Rs. ki zaroorat nahi.', coach: '5,000 rupay bhejne hain. "Amount" mein 5000 likhein.', coachUr: '"Amount" میں 5000 لکھیں۔', why: 'Ek zero zyada lagne se 50,000 chalay jatay hain. Likh kar dobara gin lein.' },
      { kind: 'quiz', screen: 'Confirm', header: 'Review Transfer', body: ['To: Ahmed Ali (Beta)', 'Account: •••• 7731', 'Amount: PKR 5,000', 'Fee: PKR 0'], question: 'Rukein! "Confirm" se pehle kya check karna hai?', options: [
        { text: 'Naam aur raqam dono sahi hain, ab Confirm', correct: true, feedback: 'Shabash! Paise bhejne se pehle hamesha naam aur raqam milayein.' },
        { text: 'Seedha Confirm, check ki zaroorat nahi', correct: false, feedback: 'Confirm ke baad paise wapas nahi aatay. Hamesha 5 second ruk kar naam aur raqam parhein.' },
      ], coach: 'Yeh aakhri check hai. Naam aur raqam parhein.', coachUr: 'یہ آخری چیک ہے۔ نام اور رقم پڑھیں۔', why: 'Har bank app paise bhejne se pehle "Review" screen dikhati hai, taa ke aap ghalti pakar sakein.' },
      { kind: 'quiz', screen: 'OTP', header: 'Enter OTP', body: ['Aap ke phone par 4 digit code bheja gaya hai.', 'SMS: Your OTP is 4821. Never share it.'], popup: { from: '📞 Call: 0301-XXXXXXX', text: '"Main bank se bol raha hoon. Aap ka transfer ruk gaya hai. Jaldi OTP batayein!"' }, question: 'Ab kya karein?', options: [
        { text: 'Phone band karein, OTP sirf app mein khud likhein', correct: true, feedback: 'Bilkul sahi! Bank kabhi call kar ke OTP nahi maangta. Yeh fraud tha.' },
        { text: 'Caller ko OTP bata dein', correct: false, feedback: 'Yeh fraud hai! OTP batane se woh aap ke paise nikal sakta hai. OTP sirf apni app mein khud likhein.' },
      ], coach: 'Achanak call aa gayi! Sochein, phir chunein.', coachUr: 'اچانک کال آ گئی! سوچیں، پھر چنیں۔', why: 'OTP ek dafa ka password hai. Jo bhi maange, chahe bank ka naam le, woh dhokebaaz hai.' },
      { kind: 'input', screen: 'OTP', header: 'Enter OTP', body: ['SMS: Your OTP is 4821. Never share it.'], label: 'OTP', expected: '4821', hint: 'SMS mein likha code: 4821', coach: 'Ab OTP khud app mein likhein: 4821', coachUr: 'اب OTP خود ایپ میں لکھیں: 4821', why: 'OTP ki jagah sirf aap ki apni bank app hai. Kisi insaan ko nahi.' },
    ],
    recap: ['"Fund Transfer" → "Saved Beneficiary" → naam chuna.', 'Raqam likhi, Review screen par naam aur raqam check ki.', 'OTP kisi ko nahi bataya, sirf app mein khud likha.'],
  },
  {
    id: 'logout',
    title: 'App band ho gayi? (Logout)',
    titleUr: 'ایپ سے نکل گئے؟',
    minutes: 1,
    steps: [
      { kind: 'quiz', screen: 'Session expired', header: 'Session Expired', body: ['Your session has expired due to inactivity.', 'Please login again.'], question: 'Yeh message aaya. Kya hua?', options: [
        { text: 'Kuch kharab nahi hua, app ne hifazat ke liye bahar nikala', correct: true, feedback: 'Sahi! Kuch der kuch na karein to app khud logout karti hai, taa ke koi aur aap ka account na khol sake.' },
        { text: 'Mera account band ho gaya / paise chalay gaye', correct: false, feedback: 'Pareshan na hon. Paise mehfooz hain. Yeh sirf hifazati logout hai.' },
      ], coach: 'Ghabrayein nahi. Message parhein.', coachUr: 'گھبرائیں نہیں۔ پیغام پڑھیں۔', why: '"Session expired" ka matlab: waqt khatam, dobara login karein. Bas.' },
      { kind: 'tap', screen: 'Login', header: 'Mashq Bank', buttons: [
        { id: 'login', label: 'Login', icon: '🔑', explain: '"Login" se dobara app mein jatay hain.' },
        { id: 'forgot', label: 'Forgot Password', icon: '❓', explain: '"Forgot Password" tab, jab password yaad na ho.' },
        { id: 'register', label: 'Register', icon: '📝', explain: '"Register" naye logon ke liye hai. Aap pehle se registered hain.' },
      ], correct: 'login', coach: 'Dobara andar jane ke liye "Login" dabayein.', coachUr: 'دوبارہ اندر جانے کے لیے "Login" دبائیں۔', why: 'Logout ke baad bas dobara Login. Register dobara nahi karna.' },
    ],
    recap: ['"Session expired" koi ghalti nahi, hifazat hai.', 'Bas "Login" dabayein aur apna password khud likhein.', 'Password kisi ko na batayein.'],
  },
];

export const SCAM_QUIZ: { text: string; from: string; scam: boolean; why: string }[] = [
  { from: '03XX-XXXXXXX', text: 'Mubarak ho! Aap ka BISP ka Rs. 25,000 ka inaam nikla hai. Lene ke liye yeh link kholein: bit.ly/bisp-pk', scam: true, why: 'Mobile number se aaya, inaam ka laalach, aur chhota link. Teeno khatray ki nishaniyan.' },
  { from: 'MEEZANBANK', text: 'PKR 5,000 debited from A/C ****7731 via ATM on 31-10-2026. Not you? Call the number on your card.', scam: false, why: 'Bank ke naam se aaya, koi link nahi, kuch maanga nahi. Phir bhi shak ho to apni app khud khol kar dekhein.' },
  { from: '0345-XXXXXXX', text: 'URGENT: Aap ka account 2 ghante mein band ho jayega. Abhi OTP bhejein.', scam: true, why: 'Jaldi ka dabao aur OTP maangna. Bank kabhi OTP nahi maangta.' },
];
