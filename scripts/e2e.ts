// Kiểm thử luồng chính qua HTTP thật. Chạy bằng `npm run test:e2e` (tự dựng CSDL riêng và máy chủ).
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const prisma = new PrismaClient();
let passed = 0; const failed: string[] = [];

function ok(cond: unknown, name: string, extra?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); } else { failed.push(name); console.log(`  ✗ ${name}`, extra ?? ''); }
}
const section = (s: string) => console.log(`\n${s}`);

class Client {
  cookie = '';
  async req(path: string, init: RequestInit & { json?: unknown; origin?: string } = {}) {
    const headers: Record<string, string> = { ...(init.headers as any) };
    if (this.cookie) headers.cookie = this.cookie;
    let body = init.body as any;
    if (init.json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(init.json); }
    if (init.origin) headers.origin = init.origin;
    const res = await fetch(BASE + path, { ...init, headers, body, redirect: 'manual' });
    const sc = res.headers.get('set-cookie');
    if (sc) { const m = sc.match(/stem_session=([^;]*)/); if (m) this.cookie = m[1] ? `stem_session=${m[1]}` : ''; }
    return res;
  }
  async json(path: string, method: string, json?: unknown) {
    const res = await this.req(path, { method, json });
    let data: any = null; try { data = await res.json(); } catch { /* */ }
    return { status: res.status, data };
  }
  async login(username: string, password: string) { const r = await this.json('/api/auth/login', 'POST', { username, password }); if (r.status !== 200) throw new Error(`login ${username} ${r.status}`); }
  async html(path: string) { const res = await this.req(path); return { status: res.status, text: await res.text(), location: res.headers.get('location') }; }
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
async function upload(c: Client, pgId: string, stageKey: number, data: Buffer, name: string) {
  const fd = new FormData(); fd.append('file', new Blob([new Uint8Array(data)]), name); fd.append('stageKey', String(stageKey));
  const res = await c.req(`/api/pg/${pgId}/evidence`, { method: 'POST', body: fd });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function main() {
  const pw = process.env.DEMO_PASSWORD || 'demo-stem-2026';
  const T = new Client();
  await T.login('giaovien', pw);

  section('1. Giáo viên tạo lớp, thêm học sinh, chia nhóm');
  const cls = await T.json('/api/classes', 'POST', { name: 'E2E 10X', grade: 10 });
  ok(cls.status === 200, 'tạo lớp', cls);
  const classId = cls.data.id;
  ok((await T.json('/api/classes', 'POST', { name: '', grade: 10 })).status === 400, 'tên lớp rỗng bị từ chối');
  const bad = await T.req('/api/classes', { method: 'POST', json: { name: 'x', grade: 10 }, origin: 'https://evil.example' });
  ok(bad.status === 403, 'chặn yêu cầu ghi từ Origin lạ (CSRF)');
  const add = await T.json(`/api/classes/${classId}/students`, 'POST', { text: 'E2E01 | Nguyễn Văn An\nE2E02 | Trần Thị Bình\nLê Cường\nPhạm Dung' });
  ok(add.status === 200 && add.data.created.length === 4, 'thêm 4 học sinh', add.data);
  const accounts: { displayName: string; username: string; password: string }[] = add.data.created;
  const dup = await T.json(`/api/classes/${classId}/students`, 'POST', { text: 'E2E01 | Trùng mã' });
  ok(dup.data.skipped.length === 1, 'mã trùng bị bỏ qua', dup.data);
  const split = await T.json(`/api/classes/${classId}/groups`, 'POST', { auto: 2 });
  ok(split.status === 200 && split.data.groups === 2, 'chia ngẫu nhiên 2 nhóm', split);
  const groups = await prisma.group.findMany({ where: { classId }, include: { members: true }, orderBy: { name: 'asc' } });
  ok(groups.length === 2 && groups.every((g) => g.members.length === 2), 'mỗi nhóm 2 học sinh');
  const [gA, gB] = groups;
  const nameOf = async (uid: string) => (await prisma.user.findUniqueOrThrow({ where: { id: uid } }));
  const [a1, a2] = await Promise.all(gA.members.map((m) => nameOf(m.userId)));
  const [b1] = await Promise.all(gB.members.map((m) => nameOf(m.userId)));
  const acc = (u: { username: string }) => accounts.find((x) => x.username === u.username)!;

  section('2. Giao dự án đầy đủ và nhiệm vụ ngắn');
  const tpl = await prisma.template.findUniqueOrThrow({ where: { key: 'bao-bi-de-vo' } });
  const tplRes = await T.json(`/api/templates/${tpl.id}`, 'GET');
  const base = { classId, templateId: tpl.id, title: 'E2E bao bì', mode: 'STEAM', kind: 'FULL', grade: 10, goals: 'g', durationWeeks: 3, dueDate: '2030-01-31', content: tplRes.data.content, rubric: tplRes.data.rubric };
  const full = await T.json('/api/projects', 'POST', { ...base, stages: [1, 2, 3, 4, 5, 6, 7].map((k) => ({ key: k })) });
  ok(full.status === 200, 'giao dự án đầy đủ', full);
  ok((await T.json('/api/projects', 'POST', { ...base, stages: [{ key: 1 }] })).status === 400, 'dự án đầy đủ thiếu chặng bị từ chối');
  const badRub = { criteria: tplRes.data.rubric.criteria.map((c: any, i: number) => (i === 0 ? { ...c, weight: 11 } : c)) };
  ok((await T.json('/api/projects', 'POST', { ...base, rubric: badRub, stages: [1, 2, 3, 4, 5, 6, 7].map((k) => ({ key: k })) })).status === 400, 'rubric tổng ≠ 100 bị từ chối');
  const shortRubric = { criteria: [{ ...tplRes.data.rubric.criteria[3], weight: 56 }, { ...tplRes.data.rubric.criteria[4], weight: 44 }] };
  const shortBody = { ...base, title: 'E2E nhiệm vụ ngắn', kind: 'SHORT', stages: [{ key: 5 }, { key: 6 }], rubric: shortRubric };
  ok((await T.json('/api/projects', 'POST', shortBody)).status === 400, 'nhiệm vụ ngắn chưa xác nhận thang điểm bị từ chối');
  const wrong = { criteria: [{ ...tplRes.data.rubric.criteria[0], weight: 100 }] };
  ok((await T.json('/api/projects', 'POST', { ...shortBody, rubric: wrong, confirmRubric: true })).status === 400, 'tiêu chí không gắn chặng được giao bị từ chối');
  const short = await T.json('/api/projects', 'POST', { ...shortBody, confirmRubric: true });
  ok(short.status === 200, 'giao nhiệm vụ ngắn (chặng 5, 6)', short);
  const pgA = await prisma.projectGroup.findFirstOrThrow({ where: { projectId: full.data.id, groupId: gA.id } });
  const pgB = await prisma.projectGroup.findFirstOrThrow({ where: { projectId: full.data.id, groupId: gB.id } });
  const pgShortA = await prisma.projectGroup.findFirstOrThrow({ where: { projectId: short.data.id, groupId: gA.id }, include: { stageWorks: true } });
  ok(pgShortA.stageWorks.length === 2, 'nhiệm vụ ngắn chỉ tạo 2 chặng');
  const sstage = await T.json(`/api/pg/${pgShortA.id}/stage/1/draft`, 'PUT', { baseVersion: 0, content: { data: {}, evidence: [] } });
  ok(sstage.status === 401 || sstage.status === 403 || sstage.status === 404, 'giáo viên không sửa bản nháp học sinh', sstage.status);

  section('3. Học sinh lưu nháp, tải lại, nộp');
  const A1 = new Client(); await A1.login(a1.username, acc(a1).password);
  const A2 = new Client(); await A2.login(a2.username, acc(a2).password);
  const B1 = new Client(); await B1.login(b1.username, acc(b1).password);
  const s1: any = { data: { situation: 'Tình huống ABC-UNIQUE-1', users: 'Người nhận', need: 'n', criteria: [{ kind: 'Tiêu chí thành công', text: 't1', check: 'c' }, { kind: 'Tiêu chí thành công', text: 't2', check: 'c' }], userProfile: 'Người dùng STEAM' }, evidence: [] };
  const d1 = await A1.json(`/api/pg/${pgA.id}/stage/1/draft`, 'PUT', { baseVersion: 0, content: s1 });
  ok(d1.status === 200 && d1.data.version === 1 && d1.data.status === 'IN_PROGRESS', 'lưu nháp lần đầu → Đang làm', d1);
  const page = await A1.html(`/student/p/${pgA.id}/stage/1`);
  ok(page.status === 200 && page.text.includes('ABC-UNIQUE-1'), 'tải lại trang thấy đúng dữ liệu đã lưu');
  const stale = await A2.json(`/api/pg/${pgA.id}/stage/1/draft`, 'PUT', { baseVersion: 0, content: { ...s1, data: { ...s1.data, situation: 'ghi đè âm thầm' } } });
  ok(stale.status === 409 && stale.data.code === 'CONFLICT' && stale.data.current.content.data.situation.includes('ABC-UNIQUE-1'), 'phát hiện phiên bản cũ, không ghi đè âm thầm', stale);
  const stillOk = (await prisma.stageWork.findFirstOrThrow({ where: { projectGroupId: pgA.id, stageKey: 1 } }));
  ok(JSON.parse(stillOk.draftJson).data.situation.includes('ABC-UNIQUE-1'), 'bản nháp gốc vẫn nguyên');
  const sub1 = await A1.json(`/api/pg/${pgA.id}/stage/1/submit`, 'POST', { baseVersion: 1 });
  ok(sub1.status === 200 && sub1.data.number === 1, 'nộp chặng 1', sub1);
  const locked = await A1.json(`/api/pg/${pgA.id}/stage/1/draft`, 'PUT', { baseVersion: 2, content: s1 });
  ok(locked.status === 409 && locked.data.code === 'LOCKED', 'đã nộp thì khoá bản nháp');
  const empty = await A1.json(`/api/pg/${pgA.id}/stage/2/submit`, 'POST', { baseVersion: 0 });
  ok(empty.status === 409 || empty.status === 422, 'không nộp được chặng chưa có nội dung', empty.status);
  await A1.json(`/api/pg/${pgA.id}/stage/2/draft`, 'PUT', { baseVersion: 0, content: { data: {}, evidence: [] } });
  const emptySub = await A1.json(`/api/pg/${pgA.id}/stage/2/submit`, 'POST', { baseVersion: 1 });
  ok(emptySub.status === 422, 'chặng trống bị chặn khi nộp (422)', emptySub);

  section('4. Phản hồi → chỉnh sửa → nộp lại → lịch sử còn nguyên');
  const sub1Row = await prisma.submission.findFirstOrThrow({ where: { stageWork: { projectGroupId: pgA.id, stageKey: 1 } } });
  const fbNoText = await T.json(`/api/pg/${pgA.id}/stage/1/feedback`, 'POST', { action: 'revision', submissionId: sub1Row.id, text: '' });
  ok(fbNoText.status === 400, 'yêu cầu bổ sung phải có nội dung');
  const fb = await T.json(`/api/pg/${pgA.id}/stage/1/feedback`, 'POST', { action: 'revision', submissionId: sub1Row.id, text: 'Hãy thêm cách kiểm tra từng tiêu chí.' });
  ok(fb.status === 200, 'giáo viên yêu cầu bổ sung', fb);
  ok((await prisma.stageWork.findFirstOrThrow({ where: { projectGroupId: pgA.id, stageKey: 1 } })).status === 'NEEDS_REVISION', 'trạng thái → Cần bổ sung');
  const again = await T.json(`/api/pg/${pgA.id}/stage/1/feedback`, 'POST', { action: 'approve', submissionId: sub1Row.id, text: '' });
  ok(again.status === 409, 'không duyệt/yêu cầu lần hai khi không còn chờ phản hồi');
  const stStu = await A2.html(`/student/p/${pgA.id}/stage/1`);
  ok(stStu.text.includes('Hãy thêm cách kiểm tra'), 'học sinh thấy phản hồi gắn với lần nộp');
  const cur = await prisma.stageWork.findFirstOrThrow({ where: { projectGroupId: pgA.id, stageKey: 1 } });
  const s1b = { ...s1, data: { ...s1.data, situation: 'Tình huống ABC-UNIQUE-2 (đã sửa)' } };
  ok((await A2.json(`/api/pg/${pgA.id}/stage/1/draft`, 'PUT', { baseVersion: cur.version, content: s1b })).status === 200, 'nhóm sửa bản nháp khi Cần bổ sung');
  const mid = await prisma.submission.findFirstOrThrow({ where: { id: sub1Row.id } });
  ok(JSON.parse(mid.contentJson).data.situation.includes('ABC-UNIQUE-1'), 'sửa nháp không đổi nội dung lần nộp trước');
  const cur2 = await prisma.stageWork.findFirstOrThrow({ where: { projectGroupId: pgA.id, stageKey: 1 } });
  const re = await A2.json(`/api/pg/${pgA.id}/stage/1/submit`, 'POST', { baseVersion: cur2.version });
  ok(re.status === 200 && re.data.number === 2, 'nộp lại → lần nộp 2', re);
  const tpage = await T.html(`/teacher/pg/${pgA.id}?stage=1`);
  ok(tpage.status === 200 && tpage.text.includes('ABC-UNIQUE-1') && tpage.text.includes('ABC-UNIQUE-2'), 'giáo viên mở được cả lần nộp 1 và 2');
  const sub2Row = await prisma.submission.findFirstOrThrow({ where: { stageWork: { projectGroupId: pgA.id, stageKey: 1 }, number: 2 } });
  const staleFb = await T.json(`/api/pg/${pgA.id}/stage/1/feedback`, 'POST', { action: 'approve', submissionId: sub1Row.id, text: '' });
  ok(staleFb.status === 409, 'không duyệt nhầm lần nộp cũ');
  ok((await T.json(`/api/pg/${pgA.id}/stage/1/feedback`, 'POST', { action: 'approve', submissionId: sub2Row.id, text: 'Tốt' })).status === 200, 'duyệt lần nộp 2');
  ok((await prisma.stageWork.findFirstOrThrow({ where: { projectGroupId: pgA.id, stageKey: 1 } })).status === 'APPROVED', 'trạng thái → Đã duyệt');
  const fbRows = await prisma.feedback.findMany({ where: { stageWork: { projectGroupId: pgA.id, stageKey: 1 } } });
  ok(fbRows.find((f) => f.kind === 'REVISION')?.submissionId === sub1Row.id && fbRows.find((f) => f.kind === 'APPROVE')?.submissionId === sub2Row.id, 'phản hồi gắn đúng lần nộp');

  section('5. Số liệu đo: dấu phẩy, số 0, ô trống, dữ liệu lỗi');
  const cols = [{ id: 'c1', name: 'Lần thử', unit: '', type: 'number' }, { id: 'c2', name: 'Khối lượng', unit: 'g', type: 'number' }, { id: 'c3', name: 'Mức hư hại', unit: '0–3', type: 'number' }];
  const mk = (cells: string[][]) => ({ id: 'dsA', label: 'Phương án A', conditions: [{ k: 'Vật thử', v: 'Bánh quy' }], rows: cells.map((r, i) => ({ id: `r${i}`, cells: { c1: r[0], c2: r[1], c3: r[2] }, note: '' })) });
  const st5 = (rows: string[][]) => ({ data: { hypothesis: 'h', varChanged: 'a', varMeasured: 'b', varControlled: 'c', data: { columns: cols, datasets: [mk(rows)], chart: { x: 'c1', y: 'c3' } } }, evidence: [] });
  let ver = 0;
  const put5 = async (rows: string[][]) => { const r = await A1.json(`/api/pg/${pgA.id}/stage/5/draft`, 'PUT', { baseVersion: ver, content: st5(rows) }); if (r.status === 200) ver = r.data.version; return r; };
  ok((await put5([['1', '96,5', '0'], ['2', '96.5', ''], ['3', '97,25', '2']])).status === 200, 'lưu bảng đo có dấu phẩy, ô trống và số 0');
  const p5 = await A1.html(`/student/p/${pgA.id}/stage/5`);
  ok(p5.text.includes('96,5'), 'trang hiển thị số theo kiểu Việt Nam (96,5)');
  await put5([['1', 'abc', '0']]);
  const badSub = await A1.json(`/api/pg/${pgA.id}/stage/5/submit`, 'POST', { baseVersion: ver });
  ok(badSub.status === 422 && String(badSub.data.error).includes('ô nhập sai'), 'ô số sai bị chặn khi nộp', badSub);
  await put5([['1', '96,5', '0'], ['2', '', '']]);
  const goodSub = await A1.json(`/api/pg/${pgA.id}/stage/5/submit`, 'POST', { baseVersion: ver });
  ok(goodSub.status === 200, 'dữ liệu có số 0 và ô trống nộp được', goodSub);
  const snapRow = await prisma.submission.findFirstOrThrow({ where: { stageWork: { projectGroupId: pgA.id, stageKey: 5 } } });
  ok(JSON.parse(snapRow.contentJson).data.data.datasets[0].rows[0].cells.c3 === '0', 'bản chụp lưu "0" khác chuỗi rỗng');

  section('6. Phân quyền theo URL trực tiếp');
  const lockedUp = await upload(A1, pgA.id, 1, PNG, 'anh.png');
  ok(lockedUp.status === 409, 'chặng đã duyệt không nhận thêm minh chứng', lockedUp);
  // chặng 1 đã duyệt nên khoá → dùng chặng 3
  const png3 = await upload(A1, pgA.id, 3, PNG, 'phac-thao.png');
  ok(png3.status === 200, 'tải minh chứng ở chặng đang mở', png3);
  const evId = png3.data.id;
  const fileA = await A1.req(`/api/files/${evId}`);
  ok(fileA.status === 200 && fileA.headers.get('content-type') === 'image/png' && fileA.headers.get('x-content-type-options') === 'nosniff', 'nhóm A tải được tệp (nosniff)');
  ok((await A2.req(`/api/files/${evId}`)).status === 200, 'bạn cùng nhóm tải được');
  ok((await B1.req(`/api/files/${evId}`)).status === 404, 'học sinh nhóm B KHÔNG tải được minh chứng nhóm A');
  ok((await new Client().req(`/api/files/${evId}`)).status === 401, 'chưa đăng nhập: 401');
  const bPage = await B1.html(`/student/p/${pgA.id}`);
  ok(bPage.status === 404, 'nhóm B mở hồ sơ nhóm A bằng URL → 404');
  ok((await B1.html(`/student/p/${pgA.id}/stage/1`)).status === 404, 'nhóm B mở chặng của nhóm A → 404');
  ok((await B1.html(`/print/${pgA.id}`)).status === 404, 'nhóm B mở bản in của nhóm A → 404');
  ok((await B1.json(`/api/pg/${pgA.id}/stage/3/draft`, 'PUT', { baseVersion: 0, content: { data: {}, evidence: [] } })).status === 404, 'nhóm B ghi vào nháp nhóm A → 404');
  ok((await B1.json(`/api/pg/${pgA.id}/stage/3/submit`, 'POST', { baseVersion: 0 })).status === 404, 'nhóm B nộp thay nhóm A → 404');
  ok((await upload(B1, pgA.id, 3, PNG, 'x.png')).status === 404, 'nhóm B tải tệp lên hồ sơ nhóm A → 404');
  ok((await B1.json(`/api/pg/${pgA.id}/stage/1/feedback`, 'POST', { action: 'comment', submissionId: sub1Row.id, text: 'x' })).status === 403, 'học sinh không gửi phản hồi giáo viên');
  ok((await B1.json(`/api/pg/${pgB.id}/grade`, 'PUT', { scores: {}, overallComment: '' })).status === 403, 'học sinh không chấm điểm');
  ok((await B1.html('/teacher')).status === 307, 'học sinh vào /teacher bị chuyển hướng');
  const badUp = await upload(A1, pgA.id, 3, Buffer.from('<html><script>alert(1)</script></html>'), 'x.png');
  ok(badUp.status === 415, 'tệp giả ảnh (HTML) bị từ chối', badUp);
  const big = await upload(A1, pgA.id, 3, Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), 'big.png');
  ok(big.status === 413, 'tệp > 5 MB bị từ chối', big.status);
  // giáo viên khác
  await prisma.user.deleteMany({ where: { username: 'gv.khac' } });
  await prisma.user.create({ data: { username: 'gv.khac', displayName: 'GV khác', role: 'TEACHER', passwordHash: await bcrypt.hash('abcd1234', 4) } });
  const T2 = new Client(); await T2.login('gv.khac', 'abcd1234');
  ok((await T2.req(`/api/files/${evId}`)).status === 404, 'giáo viên lớp khác KHÔNG tải được minh chứng');
  ok((await T2.html(`/teacher/pg/${pgA.id}`)).status === 404, 'giáo viên lớp khác không mở được hồ sơ nhóm');
  ok((await T2.json(`/api/classes/${classId}/groups`, 'POST', { name: 'x' })).status === 404, 'giáo viên lớp khác không sửa nhóm');
  ok((await T.req(`/api/files/${evId}`)).status === 200, 'giáo viên của lớp tải được minh chứng');

  section('7. Điểm nháp / công bố');
  const rub = JSON.parse((await prisma.project.findUniqueOrThrow({ where: { id: full.data.id } })).rubricJson);
  const lv = [3, 2, 1, 2, 0, 3];
  const scores = Object.fromEntries(rub.criteria.map((c: any, i: number) => [c.id, { level: lv[i], comment: `nx${i}` }]));
  const partial = { ...scores, [rub.criteria[5].id]: { level: null, comment: '' } };
  ok((await T.json(`/api/pg/${pgA.id}/grade`, 'PUT', { scores: partial, overallComment: 'DRAFT-SECRET-NOTE' })).status === 200, 'lưu nháp điểm (chưa đủ tiêu chí)');
  ok((await T.json(`/api/pg/${pgA.id}/publish`, 'POST')).status === 400, 'không công bố khi còn tiêu chí chưa chấm');
  const pg1 = await A1.html(`/student/p/${pgA.id}`);
  const pr1 = await A1.html(`/print/${pgA.id}`);
  ok(!pg1.text.includes('DRAFT-SECRET-NOTE') && !pg1.text.includes('Kết quả đã công bố') && !pr1.text.includes('DRAFT-SECRET-NOTE'), 'điểm nháp chưa hiện ở tài khoản học sinh');
  ok((await T.json(`/api/pg/${pgA.id}/grade`, 'PUT', { scores, overallComment: 'DRAFT-SECRET-NOTE' })).status === 200, 'lưu nháp đủ điểm');
  ok(!(await A1.html(`/student/p/${pgA.id}`)).text.includes('DRAFT-SECRET-NOTE'), 'đủ điểm nhưng chưa công bố vẫn ẩn');
  const pub = await T.json(`/api/pg/${pgA.id}/publish`, 'POST');
  ok(pub.status === 200 && pub.data.total === 61.25, 'công bố: tổng 61,25 theo trọng số và mức', pub);
  const pg2 = await A2.html(`/student/p/${pgA.id}`);
  ok(pg2.text.includes('DRAFT-SECRET-NOTE') && pg2.text.includes('61,25'), 'sau công bố học sinh thấy điểm và nhận xét');
  ok(!(await B1.html(`/student/p/${pgB.id}`)).text.includes('61,25'), 'nhóm B không thấy điểm nhóm A');
  const pr2 = await A2.html(`/print/${pgA.id}`);
  ok(pr2.text.includes('61,25') && pr2.text.includes('Kết quả đánh giá'), 'bản in có rubric đã công bố');
  const snapshot = (await prisma.projectGroup.findUniqueOrThrow({ where: { id: pgA.id } })).publishedJson!;
  await prisma.template.update({ where: { id: tpl.id }, data: { rubricJson: JSON.stringify({ criteria: [{ ...rub.criteria[0], weight: 100 }] }) } });
  ok((await prisma.projectGroup.findUniqueOrThrow({ where: { id: pgA.id } })).publishedJson === snapshot, 'sửa mẫu không đổi điểm của dự án cũ');
  await prisma.template.update({ where: { id: tpl.id }, data: { rubricJson: tpl.rubricJson } });

  section('8. Đóng góp / tự đánh giá cá nhân');
  ok((await A1.json(`/api/pg/${pgA.id}/contribution`, 'PUT', { contribution: 'A1-PRIVATE-CONTRIB', reflection: 'r', ratings: { tasks: 3 } })).status === 200, 'học sinh lưu đóng góp');
  ok(!(await A2.html(`/student/p/${pgA.id}/me`)).text.includes('A1-PRIVATE-CONTRIB'), 'bạn cùng nhóm không thấy tự đánh giá của nhau');
  ok(!(await A2.html(`/print/${pgA.id}`)).text.includes('A1-PRIVATE-CONTRIB'), 'bản in của bạn cùng nhóm không có đóng góp của người khác');
  ok((await A1.html(`/print/${pgA.id}`)).text.includes('A1-PRIVATE-CONTRIB'), 'bản in của chính học sinh có đóng góp của mình');
  ok((await T.html(`/teacher/pg/${pgA.id}`)).text.includes('A1-PRIVATE-CONTRIB'), 'giáo viên xem được từng thành viên');

  section('9. Bảng tiến độ giáo viên');
  const dash = await T.html('/teacher');
  ok(dash.status === 200 && dash.text.includes('E2E bao bì') && dash.text.includes('E2E nhiệm vụ ngắn'), 'bảng tiến độ hiện cả hai dự án');
  const filt = await T.html(`/teacher?projectId=${short.data.id}&status=notsubmitted`);
  ok(filt.text.includes(`id="p-${short.data.id}"`) && !filt.text.includes(`id="p-${full.data.id}"`), 'bộ lọc dự án + trạng thái');
  ok((await T.html(`/teacher/projects/${short.data.id}`)).status === 200, 'trang dự án mở được');
  ok((await T2.html(`/teacher/projects/${short.data.id}`)).status === 404, 'giáo viên khác không mở được dự án');

  section('10. Sửa hạn nộp của dự án đã giao');
  const sid = short.data.id;
  const notOverdue = await T.html(`/teacher?projectId=${sid}&status=overdue`);
  ok(!notOverdue.text.includes(`id="p-${sid}"`), 'trước khi sửa: nhiệm vụ ngắn chưa quá hạn');
  const ed = await T.json(`/api/projects/${sid}`, 'PATCH', { dueDate: '2020-01-10', stages: [{ key: 5, dueDate: '2020-01-05' }, { key: 6, dueDate: null }] });
  ok(ed.status === 200, 'giáo viên sửa hạn dự án và hạn từng chặng', ed);
  const ps = await prisma.projectStage.findMany({ where: { projectId: sid }, orderBy: { stageKey: 'asc' } });
  const pj = await prisma.project.findUniqueOrThrow({ where: { id: sid } });
  ok(pj.dueDate.toISOString() === '2020-01-10T16:59:59.000Z', 'hạn dự án lưu 23:59 giờ Việt Nam', pj.dueDate);
  ok(ps[0].dueDate?.toISOString() === '2020-01-05T16:59:59.000Z' && ps[1].dueDate === null, 'chặng 6 để trống → theo hạn dự án', ps);
  const nowOverdue = await T.html(`/teacher?projectId=${sid}&status=overdue`);
  ok(nowOverdue.text.includes(`id="p-${sid}"`), 'sau khi sửa: bảng tiến độ tính lại quá hạn');
  ok((await A1.html(`/student/p/${pgShortA.id}`)).text.includes('10/01/2020'), 'học sinh thấy hạn mới');
  ok((await T.json(`/api/projects/${sid}`, 'PATCH', { dueDate: '2030-01-10', stages: [{ key: 1, dueDate: null }] })).status === 400, 'không sửa hạn cho chặng không được giao');
  ok((await T.json(`/api/projects/${sid}`, 'PATCH', { dueDate: '2030-13-45', stages: [] })).status === 400, 'ngày sai bị từ chối');
  ok((await T2.json(`/api/projects/${sid}`, 'PATCH', { dueDate: '2030-01-10', stages: [] })).status === 404, 'giáo viên lớp khác không sửa được hạn');
  ok((await A1.json(`/api/projects/${sid}`, 'PATCH', { dueDate: '2030-01-10', stages: [] })).status === 403, 'học sinh không sửa được hạn');
  const rubBefore = (await prisma.project.findUniqueOrThrow({ where: { id: sid } })).rubricJson;
  await T.json(`/api/projects/${sid}`, 'PATCH', { dueDate: '2030-01-10', stages: [{ key: 5, dueDate: null }, { key: 6, dueDate: null }] });
  ok((await prisma.project.findUniqueOrThrow({ where: { id: sid } })).rubricJson === rubBefore, 'sửa hạn không đổi rubric đã giao');
  ok(!(await T.html(`/teacher?projectId=${sid}&status=overdue`)).text.includes(`id="p-${sid}"`), 'gia hạn → hết quá hạn');

  // dọn tài khoản kiểm thử phụ
  await prisma.user.deleteMany({ where: { username: 'gv.khac' } });
  console.log(`\n${passed} đạt, ${failed.length} lỗi`);
  if (failed.length) { console.log('Lỗi:\n- ' + failed.join('\n- ')); process.exitCode = 1; }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
