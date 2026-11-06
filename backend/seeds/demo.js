// Fake local demo data. These credentials must not be used for real accounts.
const DEMO_PASSWORD = 'Demo1@Nhom5';

const accounts = [
  { email: 'ntd.a@demo.nhom5.test', role: 'EMPLOYER', name: 'Nhà tuyển dụng A' },
  { email: 'ntd.b@demo.nhom5.test', role: 'EMPLOYER', name: 'Nhà tuyển dụng B' },
  { email: 'sv.a@demo.nhom5.test', role: 'STUDENT', name: 'Sinh viên A' },
  { email: 'sv.b@demo.nhom5.test', role: 'STUDENT', name: 'Sinh viên B' },
  { email: 'sv.c@demo.nhom5.test', role: 'STUDENT', name: 'Sinh viên C' },
];

const categories = ['Bán hàng', 'Phục vụ', 'Gia sư'];

module.exports = { DEMO_PASSWORD, accounts, categories };
