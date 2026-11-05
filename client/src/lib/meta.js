import {
  Landmark,
  Mail,
  MessageCircle,
  ShieldCheck,
  TrendingUp,
  House,
  Smartphone,
  Package,
  ScrollText,
  IdCard,
  HeartPulse,
  FileText,
  Receipt,
} from 'lucide-react';

export const ASSET_CATEGORIES = {
  BANK: { label: 'Bank account', hint: 'Savings, current, fixed deposit, locker', icon: Landmark, example: 'SBI Savings Account' },
  EMAIL: { label: 'Email account', hint: 'Gmail, Yahoo, Outlook', icon: Mail, example: 'My Gmail' },
  SOCIAL: { label: 'Social media', hint: 'Facebook, WhatsApp, Instagram', icon: MessageCircle, example: 'Facebook' },
  INSURANCE: { label: 'Insurance policy', hint: 'Life, health, vehicle', icon: ShieldCheck, example: 'LIC Jeevan Anand' },
  INVESTMENT: { label: 'Investments & pension', hint: 'Mutual funds, shares, PPF, pension', icon: TrendingUp, example: 'PPF Account' },
  PROPERTY: { label: 'Property', hint: 'House, flat, land, vehicle', icon: House, example: 'House in Green Park' },
  DEVICE: { label: 'Phone or computer', hint: 'Passcodes for your devices', icon: Smartphone, example: 'My mobile phone' },
  OTHER: { label: 'Something else', hint: 'Anything else that matters', icon: Package, example: 'Gold jewellery' },
};

export const DOCUMENT_CATEGORIES = {
  WILL: { label: 'Will', icon: ScrollText },
  PROPERTY: { label: 'Property papers', icon: House },
  INSURANCE: { label: 'Insurance papers', icon: ShieldCheck },
  IDENTITY: { label: 'ID proof (Aadhaar, PAN, passport)', icon: IdCard },
  FINANCE: { label: 'Bank and tax papers', icon: Receipt },
  MEDICAL: { label: 'Medical records', icon: HeartPulse },
  OTHER: { label: 'Other document', icon: FileText },
};

export const RELATIONSHIPS = ['Wife', 'Husband', 'Daughter', 'Son', 'Grandchild', 'Brother', 'Sister', 'Friend', 'Lawyer', 'Other relative'];

export const NOMINEE_STATUS = {
  INVITED: { label: 'Waiting for reply', tone: 'warn' },
  ACCEPTED: { label: 'Accepted', tone: 'ok' },
  DECLINED: { label: 'Declined', tone: 'danger' },
};
