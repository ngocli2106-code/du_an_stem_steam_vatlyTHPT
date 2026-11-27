import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { BUILTIN_TEMPLATES } from '../src/lib/templates';
import { endOfDayVN, toDateInput } from '../src/lib/progress';

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo-stem-2026';

async function seedTemplates() {
  for (const t of BUILTIN_TEMPLATES) {
    const data = { title: t.title, grade: t.grade, mode: t.mode, contentJson: JSON.stringify(t.content), rubricJson: JSON.stringify(t.rubric) };
    await prisma.template.upsert({ where: { key: t.key }, create: { key: t.key, ...data }, update: data });
  }
}

const rows = (vals: [string, string, string, string, string][]) => vals.map((v, i) => ({
  id: `r${i}`, cells: { c1: v[0], c2: v[1], c3: v[2], c4: v[3], c5: v[4] }, note: '',
}));

async function main() {
  await seedTemplates();
  if (await prisma.user.findUnique({ where: { username: 'giaovien' } })) {
    console.log('Dữ liệu demo đã có (giaovien). Giữ nguyên. Dùng `npm run db:reset` nếu muốn tạo lại từ đầu.');
    return;
  }
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const mk = (username: string, displayName: string, role: string, studentCode?: string) =>
    prisma.user.create({ data: { username, displayName, role, studentCode: studentCode ?? null, passwordHash: hash } });
  const teacher = await mk('giaovien', 'Cô Nguyễn Thu Hà (demo)', 'TEACHER');
  const [an, binh, chi, dung] = [
    await mk('hs.an', 'Trần Minh An', 'STUDENT', 'DEMO001'),
    await mk('hs.binh', 'Lê Bảo Bình', 'STUDENT', 'DEMO002'),
    await mk('hs.chi', 'Phạm Khánh Chi', 'STUDENT', 'DEMO003'),
    await mk('hs.dung', 'Đỗ Tiến Dũng', 'STUDENT', 'DEMO004'),
  ];
  const cls = await prisma.class.create({ data: { name: '10A2 (lớp demo)', grade: 10, teacherId: teacher.id } });
  for (const s of [an, binh, chi, dung]) await prisma.classMember.create({ data: { classId: cls.id, userId: s.id } });
  const g1 = await prisma.group.create({ data: { classId: cls.id, name: 'Nhóm 1 – Đệm Xanh' } });
  const g2 = await prisma.group.create({ data: { classId: cls.id, name: 'Nhóm 2 – Hộp Êm' } });
  const gm = (g: string, u: string, r: string) => prisma.groupMember.create({ data: { groupId: g, classId: cls.id, userId: u, roleLabel: r } });
  await gm(g1.id, an.id, 'Nhóm trưởng'); await gm(g1.id, binh.id, 'Ghi chép số liệu');
  await gm(g2.id, chi.id, 'Nhóm trưởng'); await gm(g2.id, dung.id, 'Thiết kế');

  const tpl = await prisma.template.findUniqueOrThrow({ where: { key: 'bao-bi-de-vo' } });
  const due = new Date(Date.now() + 21 * 86_400_000);
  const dueStr = toDateInput(due);
  const project = await prisma.project.create({
    data: {
      classId: cls.id, templateId: tpl.id, title: tpl.title, mode: tpl.mode, kind: 'FULL', grade: tpl.grade, isDemo: true,
      goals: 'Vận dụng xung lượng và độ biến thiên động lượng để thiết kế bao bì; rèn kĩ năng đo, ghi dữ liệu và cải tiến dựa trên minh chứng.',
      durationWeeks: 4, dueDate: endOfDayVN(dueStr), contentJson: tpl.contentJson, rubricJson: tpl.rubricJson,
      stages: { create: [1, 2, 3, 4, 5, 6, 7].map((k) => ({ stageKey: k, dueDate: new Date(Date.now() + (k * 3 - 6) * 86_400_000) })) },
    },
  });
  const pgs: Record<string, string> = {};
  for (const g of [g1, g2]) {
    const pg = await prisma.projectGroup.create({
      data: { projectId: project.id, groupId: g.id, stageWorks: { create: [1, 2, 3, 4, 5, 6, 7].map((k) => ({ stageKey: k })) } },
    });
    pgs[g.id] = pg.id;
  }

  // ---- Dữ liệu minh họa cho Nhóm 1 ----
  const sw = (k: number) => prisma.stageWork.findUniqueOrThrow({ where: { projectGroupId_stageKey: { projectGroupId: pgs[g1.id], stageKey: k } } });
  const stage1 = {
    data: {
      situation: '[Dữ liệu minh họa] Cửa hàng gốm nhỏ gửi cốc sứ qua bưu điện, nhiều đơn bị nứt khi giao.',
      users: 'Nhân viên đóng gói và người nhận hàng', need: 'Bao bì nhẹ, rẻ, bảo vệ được hàng khi rơi và dễ mở đúng cách.',
      criteria: [
        { kind: 'Tiêu chí thành công', text: 'Mức hư hại ≤ 1 (thang 0–3) ở ít nhất 4/5 lần thả', check: 'Thả 5 lần từ 1,0 m, chấm theo thang đã mô tả' },
        { kind: 'Tiêu chí thành công', text: 'Người thử đọc đúng chỉ dẫn mở', check: '3/3 người thử' },
        { kind: 'Ràng buộc', text: 'Khối lượng bao bì ≤ 150 g', check: 'Cân nhà bếp' },
      ],
      userProfile: '[Dữ liệu minh họa] Nhân viên đóng gói thường vội, ít đọc chữ nhỏ.',
    }, evidence: [],
  };
  const sw1 = await sw(1);
  const sub1 = await prisma.submission.create({
    data: { stageWorkId: sw1.id, number: 1, submittedById: an.id, contentJson: JSON.stringify({ ...stage1, evidenceMeta: [] }), submittedAt: new Date(Date.now() - 5 * 86_400_000) },
  });
  await prisma.feedback.create({ data: { stageWorkId: sw1.id, submissionId: sub1.id, authorId: teacher.id, kind: 'APPROVE', text: 'Tiêu chí rõ và kiểm tra được. Tốt!' } });
  await prisma.stageWork.update({ where: { id: sw1.id }, data: { status: 'APPROVED', draftJson: JSON.stringify(stage1), version: 3 } });

  const sw2 = await sw(2);
  const stage2 = {
    data: {
      principles: '[Dữ liệu minh họa] Xung lượng của lực bằng độ biến thiên động lượng: F·Δt = m·Δv.',
      quantities: [{ name: 'Lực trung bình', symbol: 'F', unit: 'N', role: 'Lực tác dụng lên vật khi va chạm' }, { name: 'Thời gian tương tác', symbol: 'Δt', unit: 's', role: 'Kéo dài nhờ lớp đệm' }],
      application: 'Lớp đệm bóng bóng khí kéo dài Δt nên lực trung bình tác dụng lên vật giảm.', refs: [{ src: 'SGK Vật lí 10 – Động lượng', used: 'Công thức xung lượng' }],
    }, evidence: [],
  };
  await prisma.submission.create({ data: { stageWorkId: sw2.id, number: 1, submittedById: binh.id, contentJson: JSON.stringify({ ...stage2, evidenceMeta: [] }), submittedAt: new Date(Date.now() - 86_400_000) } });
  await prisma.stageWork.update({ where: { id: sw2.id }, data: { status: 'SUBMITTED', draftJson: JSON.stringify(stage2), version: 2 } });

  const content = JSON.parse(tpl.contentJson);
  const columns = content.dataTable.columns.map((c: any, i: number) => ({ id: `c${i + 1}`, name: c.name, unit: c.unit, type: c.type }));
  const conds = [{ k: 'Vật thử', v: 'Bánh quy giòn' }, { k: 'Bề mặt rơi', v: 'Sàn gạch' }, { k: 'Cách thả', v: 'Thả tay, vật nằm ngang' }];
  const stage5 = {
    data: {
      hypothesis: '[Dữ liệu minh họa] Đệm bóng bóng khí làm giảm mức hư hại nhiều hơn đệm giấy vo.',
      varChanged: 'Loại vật liệu đệm', varMeasured: 'Mức hư hại', varControlled: 'Độ cao thả, vật thử, bề mặt rơi',
      data: {
        columns,
        datasets: [
          { id: 'dsA', label: 'Phương án A (bóng bóng khí)', conditions: conds, rows: rows([['1', '96,5', '100', '0', 'Có'], ['2', '96,5', '100', '1', 'Có'], ['3', '96,5', '100', '0', 'Có'], ['4', '96,5', '100', '1', 'Có'], ['5', '96,5', '100', '0', 'Có']]) },
          { id: 'dsB', label: 'Phương án B (giấy vo)', conditions: conds, rows: rows([['1', '88', '100', '2', 'Không'], ['2', '88', '100', '3', 'Không'], ['3', '88', '100', '1', 'Không'], ['4', '88', '100', '2', 'Không'], ['5', '88', '100', '', 'Không']]) },
        ],
        chart: { x: 'c1', y: 'c4' },
      },
    }, evidence: [],
  };
  const sw5 = await sw(5);
  await prisma.stageWork.update({ where: { id: sw5.id }, data: { status: 'IN_PROGRESS', draftJson: JSON.stringify(stage5), version: 4 } });

  console.log('Đã tạo dữ liệu demo.');
  console.log(`Tài khoản (mật khẩu chung lấy từ DEMO_PASSWORD trong .env): giaovien | hs.an, hs.binh (Nhóm 1) | hs.chi, hs.dung (Nhóm 2)`);
}

main().finally(() => prisma.$disconnect());
