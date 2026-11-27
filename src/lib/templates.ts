import type { ProjectContent, Mode } from './types';
import { DEFAULT_RUBRIC, type Rubric } from './rubric';

const baseStages = (over: Record<string, { task?: string; evidence?: string[] }> = {}): ProjectContent['stages'] => {
  const d: ProjectContent['stages'] = {
    '1': { task: 'Mô tả tình huống, đối tượng sử dụng và nhu cầu; viết 2–4 tiêu chí thành công kiểm tra được và các ràng buộc.', evidence: ['Ghi chú hoặc ảnh khảo sát nhanh người dùng (nếu có)'] },
    '2': { task: 'Tóm tắt nguyên lí Vật lí, các đại lượng và đơn vị; giải thích nguyên lí được vận dụng vào thiết kế.', evidence: ['Ảnh trang sách/tài liệu hoặc ghi chú nguồn tham khảo'] },
    '3': { task: 'Đề xuất ít nhất hai ý tưởng, so sánh theo tiêu chí và chọn một phương án để chế tạo.', evidence: ['Ảnh bản phác thảo của từng ý tưởng'] },
    '4': { task: 'Lập danh mục vật liệu, phân công, ghi nhật kí và chế tạo mẫu.', evidence: ['Ảnh sản phẩm mẫu chụp từ ít nhất 2 góc', 'Ảnh một bước chế tạo quan trọng'] },
    '5': { task: 'Nêu giả thuyết, xác định biến, tiến hành đo nhiều lần và ghi đầy đủ điều kiện đo.', evidence: ['Ảnh bố trí thí nghiệm có thể hiện dụng cụ đo', 'Ảnh số đọc gốc hoặc phiếu ghi số liệu'] },
    '6': { task: 'So sánh hai phiên bản theo cùng tiêu chí, nêu thay đổi, căn cứ và kết luận mức đạt.', evidence: ['Ảnh phiên bản cải tiến', 'Ảnh so sánh hai phiên bản (nếu có)'] },
    '7': { task: 'Tổng hợp thành báo cáo, hoàn thành tự đánh giá cá nhân và chuẩn bị câu hỏi bảo vệ.', evidence: ['Tệp PDF báo cáo hoặc ảnh áp phích (nếu có)'] },
  };
  for (const [k, v] of Object.entries(over)) d[k] = { ...d[k], ...v } as any;
  return d;
};

export interface BuiltinTemplate {
  key: string; title: string; grade: number; mode: Mode; content: ProjectContent; rubric: Rubric;
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    key: 'bao-bi-de-vo', title: 'Thiết kế bao bì bảo vệ vật dễ vỡ', grade: 10, mode: 'STEAM',
    rubric: DEFAULT_RUBRIC,
    content: {
      situation: 'Một cửa hàng đồ thủ công cần gửi hàng dễ vỡ qua đường bưu điện. Hàng thường bị hư do va chạm khi rơi. Nhóm thiết kế bao bì bằng vật liệu phổ thông để bảo vệ vật bên trong, và người nhận phải biết cách cầm, mở bao bì đúng.',
      productRequirements: [
        'Bao bì chứa được một vật thử dễ vỡ (ví dụ bánh quy giòn hoặc mô hình bằng giấy cứng) và đóng kín được.',
        'Chịu được cú thả từ độ cao quy ước của lớp mà vật thử không hư hại nặng hơn mức cho phép.',
        'Có dấu hiệu chỉ dẫn thao tác (hướng cầm, chỗ mở) mà người dùng thử đọc hiểu được.',
      ],
      background: [
        'Xung lượng của lực: F·Δt = Δp = m·Δv.',
        'Với cùng độ biến thiên động lượng, kéo dài thời gian tương tác Δt thì lực trung bình giảm.',
        'Vận tốc ngay trước va chạm khi thả từ độ cao h (bỏ qua sức cản): v = √(2gh).',
      ],
      materials: ['Hộp carton nhỏ', 'Giấy báo, bìa cứng, ống hút', 'Mút xốp hoặc bóng bóng khí tận dụng', 'Băng dính, kéo, thước', 'Cân nhà bếp', 'Bút màu để vẽ dấu hiệu chỉ dẫn'],
      criteria: [
        { text: 'Mức hư hại của vật thử sau mỗi lần thả không vượt quá mức 1 (thang 0–3) ở ít nhất 4/5 lần thử.', type: 'success' },
        { text: 'Người dùng thử đọc đúng chỉ dẫn mở/cầm ở ít nhất 3/3 người.', type: 'success' },
        { text: 'Khối lượng bao bì (không tính vật thử) không quá 150 g.', type: 'constraint' },
        { text: 'Chi phí vật liệu không quá 20 000 đồng.', type: 'constraint' },
      ],
      guidingQuestions: [
        'Vì sao lớp đệm mềm làm vật ít bị hư hơn dù vận tốc ngay trước va chạm như nhau?',
        'Thang mức hư hại 0–3 của nhóm được mô tả thế nào để hai người khác nhau chấm giống nhau?',
        'Dấu hiệu chỉ dẫn của nhóm khác gì dấu hiệu thông thường, và người thử đã đọc hiểu ra sao?',
      ],
      stages: baseStages({
        '3': { task: 'Đề xuất ít nhất hai kiểu đệm (ví dụ đệm bóng bóng khí và đệm giấy vo). Ghi quyết định thiết kế về dấu hiệu chỉ dẫn thao tác.' },
        '5': { task: 'So sánh hai phương án đệm, giữ điều kiện thả tương đương (cùng vật thử, độ cao, bề mặt rơi, cách thả). Cân khối lượng bao bì, chấm mức hư hại theo thang đã mô tả, thử mỗi phương án ít nhất 5 lần.' },
        '6': { task: 'Cải tiến phương án tốt hơn, thử lại và đặt dữ liệu hai phiên bản cạnh nhau. Mời ít nhất 3 người dùng thử đọc dấu hiệu chỉ dẫn và ghi phản hồi.' },
      }),
      dataTable: {
        columns: [
          { name: 'Lần thử', unit: '', type: 'number' },
          { name: 'Khối lượng bao bì', unit: 'g', type: 'number' },
          { name: 'Độ cao thả', unit: 'cm', type: 'number' },
          { name: 'Mức hư hại', unit: '0–3', type: 'number' },
          { name: 'Người thử đọc đúng chỉ dẫn', unit: 'Có/Không', type: 'text' },
        ],
        datasetLabels: ['Phương án A', 'Phương án B'],
        conditionKeys: ['Vật thử', 'Bề mặt rơi', 'Cách thả', 'Thang mức hư hại'],
        defaultRows: 5,
        note: 'Thang mức hư hại cần mô tả rõ: 0 = nguyên vẹn; 1 = mẻ hoặc nứt nhỏ; 2 = vỡ thành 2–3 mảnh; 3 = vỡ vụn.',
      },
      safety: 'Thả vật từ độ cao không quá 1,5 m, nơi sàn trống; không đứng dưới vật thả; không dùng thủy tinh hoặc vật có mảnh sắc làm vật thử. Dùng kéo, dao rọc giấy khi có giáo viên giám sát.',
      toolNotes: ['Cân nhà bếp: đặt trên mặt phẳng, bấm về 0 trước khi đặt bao bì.', 'Thước dây: đo từ đáy bao bì đến mặt sàn, đọc ngang tầm mắt.'],
      differentiation: {
        basic: 'Dùng bảng số liệu có sẵn, so sánh hai phương án bằng thang mức hư hại và khối lượng bao bì; giải thích định tính bằng xung lượng.',
        advanced: 'Quay video chậm để ước lượng thời gian tương tác Δt, tính vận tốc v = √(2gh) và ước lượng lực trung bình F ≈ mv/Δt cho từng phương án; nhận xét sai số.',
      },
      steamFocus: ['Thiết kế dấu hiệu chỉ dẫn thao tác (hình vẽ, mũi tên, biểu tượng).', 'Mời người dùng thử đọc và ghi lại phản hồi.', 'Giải thích phản hồi làm thay đổi thiết kế thế nào.'],
      chartHint: { x: 'Lần thử', y: 'Mức hư hại' },
    },
  },
  {
    key: 'tam-chan-giam-am', title: 'Thiết kế tấm chắn giảm âm để bàn', grade: 11, mode: 'STEM',
    rubric: DEFAULT_RUBRIC,
    content: {
      situation: 'Học sinh học nhóm ở thư viện hoặc phòng học thường bị ảnh hưởng bởi tiếng ồn từ bàn bên cạnh. Nhóm thiết kế tấm chắn để bàn giảm mức âm truyền tới người nghe bằng vật liệu phổ thông.',
      productRequirements: [
        'Tấm chắn đứng được trên bàn, gấp gọn được và không che tầm nhìn quá 30 cm chiều cao.',
        'Giảm mức âm đo được tại vị trí người nghe so với khi không có tấm chắn trong cùng điều kiện.',
        'Chi phí và vật liệu nằm trong giới hạn của lớp.',
      ],
      background: [
        'Sóng âm là sóng cơ dọc; mức cường độ âm tính bằng dB.',
        'Khi gặp bề mặt, một phần âm phản xạ, một phần bị hấp thụ, một phần truyền qua.',
        'Vật liệu xốp, mềm thường hấp thụ âm tốt hơn; bề mặt cứng, phẳng phản xạ âm mạnh.',
      ],
      materials: ['Bìa carton dày', 'Mút xốp, vải, nỉ, hộp trứng', 'Băng dính, kéo, thước', 'Điện thoại có ứng dụng đo mức âm', 'Loa phát âm cố định'],
      criteria: [
        { text: 'Mức âm đo được khi có tấm chắn thấp hơn khi không có tấm chắn (đối chứng) ít nhất 3 dB trong cùng điều kiện.', type: 'success' },
        { text: 'Kết quả lặp lại: độ chênh giữa các lần đo của cùng một phương án không quá 2 dB.', type: 'success' },
        { text: 'Chiều cao tấm chắn không quá 30 cm.', type: 'constraint' },
        { text: 'Chi phí vật liệu không quá 25 000 đồng.', type: 'constraint' },
      ],
      guidingQuestions: [
        'Vật liệu nào phản xạ, vật liệu nào hấp thụ âm tốt hơn, và nhóm kiểm chứng điều đó thế nào?',
        'Những yếu tố nào của phép đo (nguồn âm, vị trí, ứng dụng) phải giữ giống nhau giữa các phương án?',
        'Số đọc từ điện thoại có ý nghĩa gì khi chưa hiệu chuẩn, và nhóm dùng nó vào mục đích nào?',
      ],
      stages: baseStages({
        '5': { task: 'Dùng cùng nguồn âm, vị trí đặt nguồn và máy đo, cùng thiết bị và cấu hình ứng dụng đo cho mọi phương án. Ghi mức âm nền trước khi đo. Số đọc từ điện thoại chưa hiệu chuẩn chỉ dùng để so sánh tương đối trong cùng điều kiện, không phải giá trị tuyệt đối.' },
        '6': { task: 'Cải tiến tấm chắn, đo lại trong điều kiện giống lần đầu và so sánh hai phiên bản. Nêu rõ yếu tố ảnh hưởng phép đo (tiếng ồn nền, vị trí điện thoại).' },
      }),
      dataTable: {
        columns: [
          { name: 'Lần đo', unit: '', type: 'number' },
          { name: 'Mức âm nền', unit: 'dB', type: 'number' },
          { name: 'Mức âm đo được', unit: 'dB', type: 'number' },
          { name: 'Khoảng cách nguồn – máy đo', unit: 'cm', type: 'number' },
        ],
        datasetLabels: ['Đối chứng (không tấm chắn)', 'Phương án A', 'Phương án B'],
        conditionKeys: ['Nguồn âm và âm lượng', 'Vị trí nguồn và máy đo', 'Thiết bị và ứng dụng đo', 'Cấu hình ứng dụng (trọng số, tốc độ lấy mẫu)'],
        defaultRows: 5,
        note: 'Số đọc từ điện thoại chưa hiệu chuẩn: chỉ so sánh tương đối trong cùng điều kiện đo.',
      },
      safety: 'Giữ âm lượng nguồn phát ở mức thoải mái, không đặt loa sát tai và mỗi lần phát không quá 30 giây. Cắt vật liệu bằng kéo hoặc dao rọc giấy khi có giáo viên giám sát.',
      toolNotes: ['Ứng dụng đo âm: dùng cùng một điện thoại, cùng cấu hình; không dùng ốp lưng che micro.', 'Đặt điện thoại cố định (giá đỡ hoặc đánh dấu vị trí) giữa các lần đo.'],
      differentiation: {
        basic: 'So sánh mức âm trung bình giữa các phương án và đối chứng; giải thích định tính bằng phản xạ và hấp thụ.',
        advanced: 'Lặp lại đo ở hai khoảng cách, đánh giá độ phân tán, thảo luận giới hạn của micro điện thoại và đề xuất cách tăng độ tin cậy.',
      },
      steamFocus: [],
      chartHint: { x: 'Lần đo', y: 'Mức âm đo được' },
    },
  },
  {
    key: 'hop-giu-nhiet', title: 'Thiết kế hộp giữ nhiệt cho đồ uống', grade: 12, mode: 'STEAM',
    rubric: DEFAULT_RUBRIC,
    content: {
      situation: 'Nhiều bạn mang đồ uống ấm đến trường nhưng chúng nguội nhanh. Nhóm thiết kế hộp giữ nhiệt bằng vật liệu phổ thông, giữ nhiệt tốt và dễ thao tác: mở, cầm nắm và đọc nhãn trên hộp.',
      productRequirements: [
        'Hộp chứa được một cốc/chai nước ấm cố định thể tích của lớp.',
        'Giữ nhiệt tốt hơn so với đối chứng (cốc không có hộp) trong thời gian đo quy ước.',
        'Mở, cầm nắm được bằng một tay và đọc được nhãn dễ dàng.',
      ],
      background: [
        'Truyền nhiệt gồm dẫn nhiệt, đối lưu và bức xạ nhiệt.',
        'Vật liệu có hệ số dẫn nhiệt nhỏ và lớp không khí đứng yên làm giảm tốc độ truyền nhiệt.',
        'Nhiệt độ của vật nguội dần theo thời gian về nhiệt độ môi trường; tốc độ nguội lớn khi chênh lệch nhiệt độ lớn.',
      ],
      materials: ['Hộp carton hoặc hộp nhựa', 'Bông, mút xốp, giấy bạc, vải len', 'Cốc hoặc chai thử cùng loại', 'Nhiệt kế', 'Đồng hồ bấm giờ', 'Băng dính, kéo'],
      criteria: [
        { text: 'Sau 30 phút, nhiệt độ nước trong hộp cao hơn nhiệt độ nước ở đối chứng ít nhất 5 °C trong cùng điều kiện.', type: 'success' },
        { text: 'Thao tác mở và cầm nắm: 3/3 người thử thực hiện được một tay, chấm theo thang quan sát 1–4 đạt mức 3 trở lên.', type: 'success' },
        { text: 'Nhãn đọc được từ khoảng cách 50 cm.', type: 'success' },
        { text: 'Chi phí vật liệu không quá 30 000 đồng.', type: 'constraint' },
      ],
      guidingQuestions: [
        'Cơ chế truyền nhiệt nào chiếm ưu thế khiến nước nguội, và lớp vật liệu của nhóm ngăn cơ chế nào?',
        'Các điều kiện nào phải giữ gần như nhau (lượng nước, nhiệt độ ban đầu, nhiệt độ phòng) và nhóm kiểm soát bằng cách nào?',
        'Thao tác mở, cầm nắm và đọc nhãn được đánh giá bằng thang quan sát nào?',
      ],
      stages: baseStages({
        '5': { task: 'Đo nhiệt độ theo các mốc thời gian (ví dụ mỗi 5 phút), giữ lượng nước và nhiệt độ ban đầu gần như nhau. Dùng nước ấm theo hướng dẫn của giáo viên, không dùng nước sôi.' },
        '6': { task: 'So sánh đồ thị nhiệt độ theo thời gian của hai phiên bản. Cho ít nhất 3 người dùng thử mở, cầm nắm và đọc nhãn; chấm theo thang 1–4 và ghi vào mục phản hồi người dùng.' },
      }),
      dataTable: {
        columns: [
          { name: 'Thời điểm', unit: 'phút', type: 'number' },
          { name: 'Nhiệt độ nước', unit: '°C', type: 'number' },
        ],
        datasetLabels: ['Phương án A', 'Phương án B'],
        conditionKeys: ['Lượng nước', 'Nhiệt độ ban đầu', 'Nhiệt độ phòng', 'Nhiệt kế sử dụng', 'Có mở nắp trong lúc đo không'],
        defaultRows: 7,
        note: 'Ghi nhiệt độ đúng mốc thời gian. Lượng nước và nhiệt độ ban đầu của các lượt cần gần như nhau.',
      },
      safety: 'Chỉ dùng nước ấm ở nhiệt độ do giáo viên quy định (không dùng nước sôi); giáo viên hoặc học sinh được hướng dẫn rót nước, đặt cốc ổn định trên mặt phẳng, không chạm trực tiếp khi nước còn nóng.',
      toolNotes: ['Nhiệt kế: để bầu nhiệt kế ngập trong nước, không chạm đáy cốc, đợi số đọc ổn định rồi ghi.', 'Dùng cùng một nhiệt kế cho mọi lượt thử.'],
      differentiation: {
        basic: 'Vẽ đồ thị nhiệt độ theo thời gian cho hai phương án và so sánh độ giảm nhiệt sau cùng một khoảng thời gian.',
        advanced: 'Ước lượng tốc độ nguội ban đầu từ độ dốc đồ thị, thảo luận mô hình nguội dần về nhiệt độ môi trường và ảnh hưởng của bức xạ, đối lưu.',
      },
      steamFocus: ['Quyết định về thao tác mở, cầm nắm (công thái học).', 'Thiết kế nhãn dễ đọc (cỡ chữ, tương phản, biểu tượng).', 'Lấy phản hồi người dùng và cho thấy phản hồi làm đổi thiết kế.'],
      chartHint: { x: 'Thời điểm', y: 'Nhiệt độ nước' },
    },
  },
];

export function blankContent(): ProjectContent {
  return {
    situation: '', productRequirements: [], background: [], materials: [], criteria: [], guidingQuestions: [],
    stages: baseStages(),
    dataTable: {
      columns: [{ name: 'Lần đo', unit: '', type: 'number' }, { name: 'Giá trị đo', unit: '', type: 'number' }],
      datasetLabels: ['Phương án A', 'Phương án B'], conditionKeys: [], defaultRows: 5, note: '',
    },
    safety: '', toolNotes: [], differentiation: { basic: '', advanced: '' }, steamFocus: [], chartHint: { x: '', y: '' },
  };
}
