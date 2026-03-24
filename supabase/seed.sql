-- ─────────────────────────────────────────────────────────
-- 1. AUTH USERS (Locally mock authentication)
-- ─────────────────────────────────────────────────────────
-- Admin User: Elad
-- INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES ('00000000-0000-0000-0000-000000000000', '9c4ff7ca-0a1d-49ae-a664-f4a6319d4a4e', 'authenticated', 'authenticated', 'elad.maimon@gmail.com', crypt('password123', gen_salt('bf')), now(), now(), now()) ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 1.5 TEAMS
-- ─────────────────────────────────────────────────────────
INSERT INTO teams (id, name) VALUES
('11111000-0000-0000-0000-000000000000', 'רום'),
('11111000-0000-0000-0000-000000000001', 'B2B'),
('11111000-0000-0000-0000-000000000002', 'אקו-סיסטם')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 2. PEOPLE
-- ─────────────────────────────────────────────────────────
INSERT INTO people (id, name, email, role, team_id, permission, counts_toward_capacity, auth_user_id, join_date) VALUES
('0e3d46d9-a0bf-4d42-a554-48bd2b363f32', 'אורי צדיקריו', 'uri.zadikario@gmail.com', 'eng', '11111000-0000-0000-0000-000000000002', 'member', true, NULL, '2025-11-23'),
('efa621f4-c910-4550-90ba-8b1dbc576969', 'אושר יוסף', 'osheryosef8970@gmail.com', 'eng', '11111000-0000-0000-0000-000000000001', 'member', true, NULL, '2024-12-10'),
('e01af486-7785-4e1d-a957-755189c39d2a', 'אלעד מימון', 'elad.maimon@gmail.com', 'manager', NULL, 'admin', false, NULL, '2023-11-01'),
('46940aaa-4c1e-46f9-8f48-b5d6d41223e9', 'בידי אלקיים', 'Bdelkayam@gmail.com', 'manager', '11111000-0000-0000-0000-000000000000', 'member', false, NULL, '2023-11-23'),
('7b17be23-ce05-4c8e-95b1-59379ef3b53e', 'גיא אביסרור', 'gavis45627@gmail.com', 'eng', '11111000-0000-0000-0000-000000000000', 'member', true, NULL, '2024-04-14'),
('81236a00-5a7f-4a48-a1f5-70f8cef15068', 'גל פאר', 'galpeer2@gmail.com', 'eng', '11111000-0000-0000-0000-000000000002', 'member', true, NULL, '2025-11-09'),
('e10a754a-f2a9-4e70-bd7c-936e5ff58b9f', 'דניאל בלנק', 'dani300b@gmail.com', 'product', '11111000-0000-0000-0000-000000000000', 'member', false, NULL, '2024-09-15'),
('f81480b6-3fbe-43a4-b5e2-634108fc61f8', 'דניאל לנדאו', 'danilandau84@gmail.com', 'eng', '11111000-0000-0000-0000-000000000001', 'member', true, NULL, '2024-09-03'),
('2b1daac3-baa7-47c6-a540-555f0a1f1754', 'יובל סטולין', 'yuvalstolin@gmail.com', 'eng', '11111000-0000-0000-0000-000000000001', 'member', true, NULL, NULL),
('219ce5e7-3383-4d5e-ab08-aa407d6b5924', 'יותם אמרגי', 'yotam.emergy@gmail.com', 'product', '11111000-0000-0000-0000-000000000002', 'member', false, NULL, '2025-07-16'),
('ce5a690f-d99c-4978-895b-81919d966d7f', 'ליבי ספנסר', 'libispencer@gmail.com', 'eng', '11111000-0000-0000-0000-000000000002', 'member', true, NULL, '2024-06-05'),
('a8bca496-c7d1-4305-9ead-61fa487bca14', 'לוסי ג׳אנל', 'Lusijanel1@gmail.com', 'eng', '11111000-0000-0000-0000-000000000000', 'member', true, NULL, '2025-11-27'),
('4bdb7fb4-6850-42f3-8e21-774aa9032c60', 'מאיה דור', 'mayador22@gmail.com', 'eng', '11111000-0000-0000-0000-000000000001', 'member', true, NULL, '2025-11-26'),
('77ce8904-478e-4958-a389-477269f8f2c2', 'נגה ריינשטיין', 'reinoga2@gmail.com', 'eng', '11111000-0000-0000-0000-000000000000', 'member', true, NULL, '2025-05-25'),
('149adea3-ece5-4090-8c86-724cce210cf0', 'נופר דביר', 'Nofardvir1@gmail.com', 'manager', NULL, 'member', false, NULL, '2024-05-13'),
('c1d7d387-58fd-429d-850b-e65b4ca8cf62', 'נועם ריזה', 'noamraize@gmail.com', 'product', '11111000-0000-0000-0000-000000000001', 'member', false, NULL, '2025-05-28'),
('ea399d0c-aeb5-408f-b6d0-378cb2120e2b', 'עינת לוי', 'einatle1@gmail.com', 'product', '11111000-0000-0000-0000-000000000000', 'member', false, NULL, '2024-07-23'),
('7d1a1d4c-71cd-4ccc-a82e-a1d7738eef89', 'קארן יצחק', 'Karenitz2708@gmail.com', 'eng', '11111000-0000-0000-0000-000000000000', 'member', true, NULL, '2023-11-29'),
('9283e42e-64ae-43de-9564-04eddccef123', 'רועי כהן', 'royi9729@gmail.com', 'eng', '11111000-0000-0000-0000-000000000000', 'member', true, NULL, '2023-11-29'),
('366bf41f-55dd-413b-8363-fcb6a370543b', 'ריי מנדלאוי', 'raynmgaming@gmail.com', 'eng', '11111000-0000-0000-0000-000000000000', 'member', true, NULL, '2025-10-20'),
('41429e49-e887-433d-892e-b460642babde', 'שגב ביטון', 'segev1278@gmail.com', 'eng', '11111000-0000-0000-0000-000000000001', 'member', true, NULL, '2025-05-25'),
('e9c7586f-dfa5-482d-8909-135c8f2263d0', 'שקד אלון', 'shakedalon5202411@gmail.com', 'manager', '11111000-0000-0000-0000-000000000001', 'member', false, NULL, '2025-02-15'),
('9adc0837-50ad-4ed4-9824-ce638dde986b', 'תאו טולר', 'theothuller11@gmail.com', 'eng', '11111000-0000-0000-0000-000000000000', 'member', true, NULL, '2025-05-29'),
('ada9ff5d-85fc-4637-8e4e-ca5949acfe17', 'תמי קיקוזשוילי', 'tamikikoz@gmail.com', 'eng', '11111000-0000-0000-0000-000000000001', 'member', true, NULL, '2025-10-19'),
('dc03fbab-7995-4efa-8b1e-e8dbf42d22a0', 'בר כהן', 'bar6135@gmail.com', 'manager', '11111000-0000-0000-0000-000000000001', 'member', false, NULL, '2025-02-12')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 3. INITIATIVES
-- ─────────────────────────────────────────────────────────
INSERT INTO initiatives (id, title, owner_id) VALUES
(1, 'הגנת נקודה', 'e01af486-7785-4e1d-a957-755189c39d2a'),
(2, 'השפעות ספקטרליות', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b'),
(3, 'עוקב והיתוך', 'e01af486-7785-4e1d-a957-755189c39d2a'),
(4, 'dev happiness', 'e01af486-7785-4e1d-a957-755189c39d2a'),
(5, 'המלצות אוטומטיות', 'e01af486-7785-4e1d-a957-755189c39d2a'),
(6, 'הטמעות', 'dc03fbab-7995-4efa-8b1e-e8dbf42d22a0'),
(7, 'קשרי לקוחות', 'dc03fbab-7995-4efa-8b1e-e8dbf42d22a0'),
(8, 'ניהול ותכנון מרשמי טיסה', '219ce5e7-3383-4d5e-ab08-aa407d6b5924'),
(9, 'סימולטור', '219ce5e7-3383-4d5e-ab08-aa407d6b5924'),
(10, 'ניהול תשתיות שמיים ברוק״ק', '219ce5e7-3383-4d5e-ab08-aa407d6b5924'),
(11, 'העשרת מקורות גילוי', 'c1d7d387-58fd-429d-850b-e65b4ca8cf62'),
(12, 'חיבור רב-ארגוני', 'c1d7d387-58fd-429d-850b-e65b4ca8cf62'),
(13, 'הרמטיות ותקינת מידע', 'c1d7d387-58fd-429d-850b-e65b4ca8cf62'),
(14, 'מאגר כמוצר', 'c1d7d387-58fd-429d-850b-e65b4ca8cf62'),
(15, 'הרחבת מפעל המידע', 'c1d7d387-58fd-429d-850b-e65b4ca8cf62'),
(16, 'הנגשות מאגר', 'c1d7d387-58fd-429d-850b-e65b4ca8cf62'),
(17, 'מידור והרשאות', 'c1d7d387-58fd-429d-850b-e65b4ca8cf62'),
(18, 'היסטוריית מידע', 'c1d7d387-58fd-429d-850b-e65b4ca8cf62'),
(19, 'רציפות, שרידות וביצועים', '149adea3-ece5-4090-8c86-724cce210cf0'),
(20, 'תחקור טכנו-מבצעי', '149adea3-ece5-4090-8c86-724cce210cf0'),
(21, 'מחקר ביצועים', '149adea3-ece5-4090-8c86-724cce210cf0'),
(22, 'תחקור מבצעי', '149adea3-ece5-4090-8c86-724cce210cf0'),
(23, 'תמונה מודיעינית', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b'),
(24, 'ניהול צד כחול', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b'),
(25, 'תמונ״ש ברוק״ק (רום)', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b'),
(26, 'ניהול סנסורים', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b'),
(27, 'הפצה וניהול תמונ״ש בלומ״ר', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b'),
(28, 'ניהול אירועי רוק״ק', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b'),
(29, 'פו״ש ודגלים', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b'),
(30, 'התרעות משתמש', 'ea399d0c-aeb5-408f-b6d0-378cb2120e2b')
ON CONFLICT DO NOTHING;

