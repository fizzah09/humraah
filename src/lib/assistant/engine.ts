import type { AssistantRequest, AssistantStep } from './schema';
import { bankById } from '../banks/directory';
import { bankName, detectBank, detectTask, findPlaybook, pickTarget, type Playbook } from './playbooks';

export interface EngineReply {
  step: AssistantStep;
  state: AssistantRequest['state'];
  mode: 'playbook' | 'generic' | 'ai';
}

const SECRET_ASK = /\b(otp|pin|password|passcode|cvv)\b|پن|پاس ورڈ|او ٹی پی/i;
const SECRET_VALUE = /\b\d{4,6}\b.*\b(otp|pin)\b|\b(otp|pin)\b.*\b\d{4,6}\b|\b\d{13,19}\b/i;

const base = (p: Partial<AssistantStep>): AssistantStep => ({
  screen_name: 'chat',
  confidence: 1,
  next_instruction_ur: '',
  next_instruction_roman: '',
  target_label: null,
  warnings: [],
  needs_clarification: false,
  is_money_step: false,
  task_complete: false,
  ...p,
});

/** Guards that run before any AI or playbook logic (PRD F1-6). */
export function secretGuard(message: string, ocrText?: string): AssistantStep | null {
  if (SECRET_VALUE.test(message)) {
    return base({
      next_instruction_ur: 'براہ کرم اپنا PIN، OTP یا کارڈ نمبر یہاں نہ لکھیں۔ میں کبھی یہ نہیں مانگوں گا۔',
      next_instruction_roman: 'Meharbani kar ke apna PIN, OTP ya card number yahan na likhein. Main kabhi yeh nahi maangunga.',
      warnings: ['Secret detected in message and not stored.'],
    });
  }
  if (/\b(share|bata|bhej|tell|give)\w*\b/i.test(message) && SECRET_ASK.test(message)) {
    return base({
      next_instruction_ur: 'OTP یا PIN کسی کو بھی نہ بتائیں، بینک والوں کو بھی نہیں۔ یہ صرف آپ کی اپنی ایپ میں ڈالا جاتا ہے۔',
      next_instruction_roman: 'OTP ya PIN kisi ko bhi na batayein, bank walon ko bhi nahi. Yeh sirf aap ki apni app mein dala jata hai.',
    });
  }
  if (ocrText && /\b(password|mpin|login pin|passcode)\b/i.test(ocrText) && /\b(login|log in|sign in)\b/i.test(ocrText)) {
    return base({
      screen_name: 'Login',
      next_instruction_ur: 'یہ لاگ ان اسکرین ہے۔ اپنا پاس ورڈ یا PIN خود لکھیں، کسی کو نہ دکھائیں۔ لاگ ان کے بعد مین اسکرین کا اسکرین شاٹ بھیجیں۔',
      next_instruction_roman: 'Yeh login screen hai. Apna password ya PIN khud likhein, kisi ko na dikhayein. Login ke baad main screen ka screenshot bhejein.',
      why_roman: 'Login aap ki chaabi hai. Saathi ko bhi is ki zaroorat nahi.',
    });
  }
  if (ocrText && /\b(otp|one[\s-]?time)\b[^\n]{0,30}\b\d{4,8}\b/i.test(ocrText)) {
    return base({
      next_instruction_ur: 'اس اسکرین شاٹ میں OTP نظر آ رہا ہے۔ اسے کسی کو نہ بھیجیں۔ میں نے اسے محفوظ نہیں کیا۔',
      next_instruction_roman: 'Is screenshot mein OTP nazar aa raha hai. Isay kisi ko na bhejein. Main ne isay mehfooz nahi kiya.',
      warnings: ['Screenshot contains an OTP. Not repeated, image discarded.'],
    });
  }
  return null;
}

function detectScreenIndex(pb: Playbook, ocr: string | undefined, fallback: number): { idx: number; confidence: number } {
  if (!ocr) return { idx: fallback, confidence: 0.6 };
  const t = ocr.toLowerCase();
  let best = { idx: fallback, score: 0 };
  pb.steps.forEach((s, i) => {
    const score = s.expectLabels.filter((l) => t.includes(l.toLowerCase())).length / s.expectLabels.length;
    // prefer screens at/after where we are, to resist going backwards on shared labels
    const bias = i >= fallback ? 0.05 : 0;
    if (score + bias > best.score) best = { idx: i, score: score + bias };
  });
  return best.score >= 0.3 ? { idx: best.idx, confidence: Math.min(0.95, 0.5 + best.score / 2) } : { idx: fallback, confidence: 0.5 };
}

/** Offline engine: deterministic, playbook-driven. Used when no AI key is set and as a fallback. */
export function playbookEngine(req: AssistantRequest): EngineReply {
  const state = { ...req.state };
  const msg = req.message.trim();
  const guard = secretGuard(msg, req.ocrText);
  if (guard) return { step: guard, state, mode: 'playbook' };

  // Recovery commands (F1-8)
  if (/\b(lost|shuru|start over|restart|home screen)\b|گم/i.test(msg)) {
    state.stepIndex = 0;
    return {
      step: base({
        next_instruction_ur: 'کوئی بات نہیں۔ اپنی بینک ایپ کی مین اسکرین پر جائیں اور اسکرین شاٹ بھیجیں۔',
        next_instruction_roman: 'Koi baat nahi. Apni bank app ki main screen par jayein aur screenshot bhejein.',
      }),
      state,
      mode: 'playbook',
    };
  }
  if (/\b(galat|wrong|undo|back|peechay|wapas)\b|غلط|واپس/i.test(msg)) {
    state.stepIndex = Math.max(0, state.stepIndex - 1);
    return {
      step: base({
        next_instruction_ur: 'پریشان نہ ہوں۔ فون کا "Back" بٹن دبائیں اور نئی اسکرین کا اسکرین شاٹ بھیجیں۔',
        next_instruction_roman: 'Pareshan na hon. Phone ka "Back" button dabayein aur nayi screen ka screenshot bhejein.',
        target_label: 'Back',
      }),
      state,
      mode: 'playbook',
    };
  }

  if (msg) {
    state.bank = detectBank(msg) ?? state.bank;
    const t = detectTask(msg);
    if (t && t !== state.task) { state.task = t; state.stepIndex = 0; }
  }

  if (!state.task) {
    return {
      step: base({
        needs_clarification: true,
        next_instruction_ur: 'آپ کیا کرنا چاہتے ہیں؟ مثلاً: بیلنس دیکھنا، پیسے بھیجنا، یا بل ادا کرنا۔',
        next_instruction_roman: 'Aap kya karna chahte hain? Maslan: balance dekhna, paise bhejna, ya bill ada karna.',
      }),
      state,
      mode: 'playbook',
    };
  }

  const pb = findPlaybook(state.task);
  if (!req.image) {
    if (!state.bank) {
      return {
        step: base({
          needs_clarification: true,
          next_instruction_ur: 'آپ کون سی بینک ایپ استعمال کرتے ہیں؟ (HBL، UBL، MCB، Meezan، NBP، ABL)',
          next_instruction_roman: 'Aap kaunsi bank app istemal karte hain? (HBL, UBL, MCB, Meezan, NBP, ABL)',
        }),
        state,
        mode: 'playbook',
      };
    }
    return {
      step: base({
        next_instruction_ur: `براہ کرم اپنی ${bankName(state.bank) ?? 'بینک'} ایپ کھولیں، خود لاگ ان کریں، اور مین اسکرین کا اسکرین شاٹ بھیجیں۔`,
        next_instruction_roman: `Meharbani kar ke apni ${bankName(state.bank) ?? 'bank'} app kholein, login khud karein, aur main screen ka screenshot bhejein.`,
        warnings: ['Login ka password ya PIN sirf apni app mein khud dalein. Login screen ka screenshot na bhejein.'],
      }),
      state,
      mode: 'playbook',
    };
  }

  if (!pb) {
    return {
      step: base({
        confidence: 0.3,
        needs_clarification: true,
        next_instruction_ur: 'اس بینک کی ایپ کے لیے میرے پاس رہنمائی نہیں ہے۔ اسکرین پر لکھے بٹن بتائیں، یا کارڈ کے پیچھے لکھے ہیلپ لائن نمبر پر کال کریں۔',
        next_instruction_roman: 'Is bank ki app ke liye mere paas rehnumai nahi hai. Screen par likhe button batayein, ya card ke peechay likhe helpline number par call karein.',
        warnings: ['Generic mode: lower confidence, double-check every step.'],
      }),
      state,
      mode: 'generic',
    };
  }

  const { idx, confidence } = detectScreenIndex(pb, req.ocrText, state.stepIndex);
  const s = pb.steps[idx];
  const target = pickTarget(s, req.ocrText);
  const last = idx === pb.steps.length - 1;
  state.stepIndex = Math.min(idx + 1, pb.steps.length - 1);
  const warnings: string[] = [];
  if (s.moneyStep) warnings.push('Verification checkpoint: naam aur raqam apni app mein khud check karein. OTP kisi ko na batayein.');
  if (!target.seen) warnings.push(`Mujhe screen par "${target.label}" likha nazar nahi aaya. Is jaisa button dhoondein: ${s.targets.slice(1, 4).map((t) => `"${t}"`).join(', ')}. Na mile to batayein.`);
  else if (confidence < 0.6) warnings.push('Mujhe screen poori tarah samajh nahi aayi. Agar button nazar na aaye to batayein.');
  const bank = bankById(state.bank);
  if ((!target.seen || confidence < 0.6) && bank) warnings.push(`Phir bhi samajh na aaye to ${bank.name} helpline: ${bank.helplines[0]} (bank ki apni website se liya gaya number).`);
  const fill = (x: string) => x.replace('{label}', target.label);

  return {
    step: base({
      screen_name: s.screen,
      confidence: target.seen ? confidence : Math.min(confidence, 0.5),
      next_instruction_ur: fill(s.ur),
      next_instruction_roman: fill(s.roman),
      target_label: target.seen ? target.label : null,
      warnings,
      is_money_step: !!s.moneyStep,
      task_complete: last,
      recap_roman: last ? pb.recap : undefined,
      why_roman: s.why,
    }),
    state: last ? { task: null, bank: state.bank, stepIndex: 0 } : state,
    mode: 'playbook',
  };
}
