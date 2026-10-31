# Phase 11 — Complete Lexicographic Research, Semantic Coverage & Final Closure Report

- **Repository:** `phatnguyen03022001/ielts-tradition` (`main` — `MAIN_ONLY`)
- **Baseline HEAD (Pre-Commit):** `5b679c60c4cce7d83e123fb00270cb87082e0dd4`
- **Target Snapshot:** `data/candidates/pilot-fanout-002.json` (SHA-256: `d203048c769d6e033f219dc58531d3db9c87c59a00ec8482f9748a3005cab805`)
- **Phase 11 Research Status:** `PHASE_11_AI_RESEARCH_COMPLETE`
- **Publication Eligibility:** `NOT READY` (`publicationReady: false` — fail-closed by design)

---

## 1. Phương Pháp Nghiên Cứu & Mô Hình Vận Hành (Operating Model & Methodology)

Dự án vận hành theo mô hình **AI-Only** minh bạch với sự phân tách trách nhiệm nghiêm ngặt:
- **Lead Architect (ChatGPT):** Kiến trúc, kiểm toán kỹ thuật độc lập và nghiệm thu.
- **Independent Lexicographic Researcher, Linguistic QA Lead & Phase 11 Integrator (Antigravity):** Nghiên cứu ngôn ngữ học, đối chiếu nguồn chứng cứ, phản biện chéo và đóng gói bộ hồ sơ chuẩn hóa Phase 11.
- **Phase 12–13 Executor (Codex):** Thực thi sửa dữ liệu, vá lỗi kỹ thuật và chạy kiểm thử xuất bản ở Phase 12–13.

Bộ hồ sơ chính thức của Phase 11 phân biệt tuyệt đối 6 tầng trạng thái:
1. **AI research conclusions (`AI_RESEARCHED` / `AI_CROSS_CHECKED`):** Kết luận phân tích ngữ nghĩa, cú pháp và dịch thuật dựa trên đối chiếu nguồn từ điển.
2. **Deterministically validated facts (`DETERMINISTIC_SCHEMA_GRAPH_VERIFIED`):** Các bất biến được kiểm chứng tự động qua JSON Schema V2 và `validators/graph-v1.mjs`.
3. **Independent linguistic evidence:** Căn cứ tra cứu từ các nguồn từ điển độc lập (OALD, Cambridge, Collins, Merriam-Webster, Open English WordNet 2024, Princeton WordNet 3.1, *Từ điển tiếng Việt* — Hoàng Phê, Wiktionary EN/VI).
4. **Source provenance:** Định danh nguồn, URL/phiên bản, vị trí tra cứu và phạm vi áp dụng.
5. **Rights / license clearance (`rightsCleared: false`):** Trạng thái bản quyền và quyền tái phân phối thực tế.
6. **Publication eligibility (`publicationEligible: false`):** Chỉ mở khi thỏa mãn toàn bộ cổng kiểm soát trong `validators/production-gates.mjs`.

Không có bất kỳ sự phê duyệt của con người (`human_verified`), chữ ký giả hay giấy phép tái phân phối giả mạo nào được tạo ra trong Phase 11.

---

## 2. Toàn Vẹn Snapshot Đầu Vào (Snapshot Integrity)

Đã kiểm chứng trực tiếp từ kho mã nguồn tại `HEAD = 5b679c60c4cce7d83e123fb00270cb87082e0dd4`:

| Đầu vào bất biến | Đường dẫn | SHA-256 | Số lượng |
| :--- | :--- | :--- | :--- |
| **Candidate Snapshot** | `data/candidates/pilot-fanout-002.json` | `d203048c769d6e033f219dc58531d3db9c87c59a00ec8482f9748a3005cab805` | **54 records** (`13 lex`, `15 sns`, `9 con`, `16 eqv`, `1 fam`, `0 rel`) |
| **Phase 8 Evidence Dossier** | `data/reviews/phase8-evidence-dossier.json` | `39e387ac31b9f90a5ed65f2aeaa9069618639365bba960c6e375a81ecc0d182b` | 7 sources (`reference_only`) |
| **Phase 9 Correction Ledger** | `data/reviews/phase9-correction-ledger.json` | `06bd59f031767c2b452ad7991e8b7f8baad64242aa66f0f043073e460fff695e` | 10 remediations |
| **Phase 10 Review Queue** | `data/reviews/phase10-editorial-review-queue.json` | `89a25af14782c2221ef89f9d817bb25a49ee1b89a332c0048c3179578bfe4c67` | **376 review items** (`372 claimPaths` + `4 scopedIssues`) |

---

## 3. Tổng Hợp Đối Soát 376 Review Items (Part A — Final Reconciliation)

Toàn bộ **376/376** mục trong `data/reviews/phase10-editorial-review-queue.json` đã được đối chiếu 1:1 trong `data/reviews/phase11/research-dossier.json` và `data/reviews/phase11/correction-ledger.json`:

| Phân loại Assessment (`research-dossier.json`) | Claim Paths (`372`) | Scoped Issues (`4`) | Tổng cộng (`376`) | Phân loại Ledger (`correction-ledger.json`) | Số lượng Ledger |
| :--- | ---: | ---: | ---: | :--- | ---: |
| **`SUPPORTED`** | 322 | 0 | **322** | `NO_CHANGE` (308) + `RECOMMENDED_IMPROVEMENT` (14) | **322** |
| **`CORRECTION_NEEDED`** | 33 | 2 | **35** | `REQUIRED_CORRECTION` | **35** |
| **`DISPUTED`** | 2 | 1 | **3** | `DISPUTED` | **3** |
| **`INSUFFICIENT_EVIDENCE`** | 15 | 1 | **16** | `INSUFFICIENT_EVIDENCE` | **16** |
| **Tổng cộng** | **372** | **4** | **376** | **Tổng cộng** | **376** |

### Giải quyết dứt điểm các vấn đề đối soát trọng tâm (A1–A8)

1. **A1 — Giải quyết chênh lệch `35` vs `33` `REQUIRED_CORRECTION`:**
   - **Nguyên nhân gốc:** Trong tổng số **35** mục có `assessment: "CORRECTION_NEEDED"` (`status: "REQUIRED_CORRECTION"`), có **33 mục là `PUBLICATION_CLAIM`** (thuộc 372 `publicationClaimPaths`) và **2 mục là `SCOPED_ISSUE`** (thuộc 4 `scopedIssues`). Phụ lục coverage trước đó chỉ đếm 33 mục cấp claim path mà bỏ sót 2 mục scoped issue.
   - **Hai mục tạo nên hiệu số `35 - 33 = 2`:**
     1. `P10-ISSUE-run-boundary` (`SCOPED_ISSUE` trên `sense-run-machine`, `construction-run-machine`, `construction-run-machine-transitive`) — `REQUIRED_CORRECTION`.
     2. `P10-ISSUE-analysis-family` (`SCOPED_ISSUE` trên `family-analysis`, `entry-analyse`, `entry-analysis`, `entry-analytical`) — `REQUIRED_CORRECTION`.
   - **Kết luận chuẩn hóa:** Con số chính thức trên toàn bộ 376 review items là **35 `REQUIRED_CORRECTION`** (`33 claimPaths + 2 scopedIssues`), **14 `RECOMMENDED_IMPROVEMENT`**, **3 `DISPUTED`**, **16 `INSUFFICIENT_EVIDENCE`**, và **308 `NO_CHANGE`**.
2. **A2 — Loại bỏ dương tính giả trên ví dụ của `advice` (`P10-sense-advice-guidance-entity-examples-0-vi`):**
   - Câu tiếng Anh `"She gave me some useful advice."` được dịch là `"Cô ấy cho tôi một lời khuyên hữu ích."`.
   - Trong tiếng Việt, `lời khuyên` sử dụng danh từ đơn vị `lời` nên cách diễn đạt `"cho một lời khuyên hữu ích"` là hoàn toàn tự nhiên và chuẩn ngữ pháp tiếng Việt. Do đó, mục này được giữ ở trạng thái **`SUPPORTED`** (`RECOMMENDED_IMPROVEMENT` tùy chọn nếu muốn nhấn mạnh lượng số nhiều `"những/vài lời khuyên hữu ích"`), không tính là lỗi bắt buộc sửa.
3. **A3 — Giữ `SUPPORTED` cho `equiv-analysis.glossVi` (`"phân tích"`):**
   - `"phân tích"` là hình thức mục từ chuẩn trong từ điển Anh–Việt và `equiv-analysis.restrictions[0]` đã ghi rõ khả năng danh hóa bằng `"sự phân tích"`. Mục `P10-equiv-analysis-entity-glossVi` được giữ là **`SUPPORTED`** (`RECOMMENDED_IMPROVEMENT`).
4. **A4 — Giữ `SUPPORTED` cho `equiv-big.glossVi` (`"lớn"`):**
   - `"lớn"` là bản dịch chính xác cho `sense-big-size`, và `equiv-big.restrictions[0]` đã ghi chú rõ việc dùng `"to"` trong ngữ cảnh cụ thể đời thường. Mục `P10-equiv-big-entity-glossVi` được giữ là **`SUPPORTED`** (`RECOMMENDED_IMPROVEMENT`).
5. **A5 — Ranh giới nghĩa của `sense-run-machine` (`P10-ISSUE-run-boundary`):**
   - Tuân thủ `docs/sense-division.md`, **không tách** `sense-run-machine` thành hai sense riêng chỉ vì sự luân phiên nội/ngoại động từ (`ambitransitive`). Tuy nhiên, vì `sense-run-machine` liên kết với cả `construction-run-machine` (intransitive) và `construction-run-machine-transitive` (transitive), trường `definition` hiện tại (*"Function or operate, especially of a machine or system."*) bắt buộc phải mở rộng (`REQUIRED_CORRECTION`) thành *"Function or operate, of a machine, vehicle, or system; or cause a machine, system, or program to operate."* để khớp với cả hai khung cú pháp và hai bản dịch `hoạt động` (intransitive) / `vận hành` (transitive & formal technical).
6. **A6 — Tuân thủ đúng Schema V2 cho `WordFamily` (`family-analysis`):**
   - Theo `schemas/v2/word-family.schema.json`, `WordFamily` chỉ có `familyBasis` và `label` (không có `rootLemma` hay `memberEntryIds`; không tự suy diễn cạnh `DERIVED_FROM`). Mục `P10-family-analysis-entity-label` và `P10-ISSUE-analysis-family` được đánh dấu `REQUIRED_CORRECTION` thuần túy để xóa chuỗi meta-language nội bộ `"candidate word family (root segmentation not asserted)"` khỏi `label`.
7. **A7 — Bản quyền và tính nguyên bản (`P10-ISSUE-rights-sources`):**
   - Sự trùng lặp 5–8 từ trong định nghĩa cơ bản hoặc câu ví dụ SVO ngắn không phải là bằng chứng đạo văn tự động. Ngược lại, việc diễn đạt lại bằng AI cũng không tự động tạo ra quyền tái phân phối (`rightsCleared: false`).
8. **A8 — Quét sạch 100% ô nhiễm ngôn ngữ biên tập nội bộ (Metadata Contamination):**
   - Đã xác định chính xác **30 claim paths** chứa chuỗi quy trình nội bộ (`candidate`, `pending review`, `LER`, `draft record`, `not modeled here`) cùng **2 lỗi gán sai mã ngôn ngữ** (`contrastiveNotes/0/language: "vi"` cho văn bản tiếng Anh trên `sense-big-size` và `sense-large-size`) và **1 định nghĩa thiếu vế ngoại động từ** (`sense-run-machine.definition`) = **33 claim-path `REQUIRED_CORRECTION`**.

---

## 4. Nghiên Cứu Đầy Đủ Đồng Nghĩa, Trái Nghĩa & Đối Lập Quan Hệ (Part B — Synonyms, Antonyms & Converses)

Toàn bộ **15/15 `LexicalSense` tiếng Anh** trong pilot đã được kiểm toán đầy đủ về quan hệ đồng nghĩa, gần nghĩa, trái nghĩa thang độ, trái nghĩa bổ sung và đối lập quan hệ trong `data/reviews/phase11/semantic-coverage.json` và `data/reviews/phase11/staged-lexical-candidates.json`:

1. **Near-Synonymy có bằng chứng độc lập (`rel-big-large-near-synonym`):**
   - Hai đầu mút `sense-big-size` và `sense-large-size` đều tồn tại trong `pilot-fanout-002.json`.
   - Thay thế được cho nhau khi bổ nghĩa cho vật thể/không gian đếm được cụ thể (*a big/large house*), nhưng **không thay thế được** khi đi với danh từ chỉ đại lượng (*a large amount/number/proportion*) hoặc nghĩa bóng chỉ tầm quan trọng (*a big decision/mistake*).
   - Đã tạo bản ghi đề xuất `rel-big-large-near-synonym` (`relationType: "NEAR_SYNONYM_OF"`) kèm `qualifiers.context` và chứng cứ từ Cambridge, OALD, Open English WordNet.
2. **Antonymy có bằng chứng độc lập kèm Staged Target Endpoint (`entry-small`, `sense-small-size`, `equiv-small`, `rel-big-small-antonym`, `rel-large-small-antonym`):**
   - Nghiên cứu đầy đủ mục từ còn thiếu `small` (`adjective`, nghĩa kích thước/quy mô vật lý nhỏ hơn mức trung bình) và đóng gói 3 bản ghi ứng viên (`entry-small`, `sense-small-size`, `equiv-small` -> `"nhỏ"`) cùng 2 bản ghi quan hệ trái nghĩa thang độ (`rel-big-small-antonym` và `rel-large-small-antonym`, `relationType: "ANTONYM_OF"`).
3. **Phân biệt Converse / Relational Opposition với Antonymy (`CONVERSE-EVAL-BORROW-LEND-001`):**
   - Cặp `sense-borrow-temporary-use` ↔ `sense-lend-temporary-use` có đủ hai đầu mút trong pilot nhưng biểu thị **cùng một giao dịch chuyển giao tạm thời với vai tham tố đảo ngược** ($X \text{ borrows } Y \text{ from } Z \iff Z \text{ lends } Y \text{ to } X$).
   - Vì `schemas/v1/vocabularies.json` hiện chỉ có `ANTONYM_OF` (chưa có `CONVERSE_OF`), việc gán cạnh `ANTONYM_OF` trần sẽ khiến người học nhầm hai từ có cùng khung chủ ngữ (`*"borrow me your pen"`). Do đó, Phase 11 **bác bỏ việc gán `ANTONYM_OF` cho `borrow ↔ lend`** và ghi nhận đầy đủ phân tích đối lập quan hệ trong `semantic-coverage.json`.
4. **Quyết định bao phủ cho 11 sense còn lại:**
   - 10 sense thuộc nhóm danh từ định danh tổ chức/địa hình/quá trình hoặc động từ chuyên biệt không có từ trái nghĩa nhị phân thông dụng (`NO_CONVENTIONAL_ANTONYM` / `NO_BINARY_ANTONYM`): `sense-bank-financial`, `sense-bank-river`, `sense-run-movement`, `sense-run-management`, `sense-analyse`, `sense-analysis`, `sense-analytical`, `sense-depend-contingent`, `sense-look-up-reference`, `sense-advice-guidance`.
   - 1 sense (`sense-run-machine`) có đối lập trạng thái bổ sung với `stop / shut down / break down` (`DEFERRED_MISSING_TARGET_ENDPOINT`).

---

## 5. Đa Nghĩa Tiếng Anh, Đa Nghĩa Tiếng Việt & 16 Bản Dịch Anh–Việt (Part C)

### 5.1. Kiểm toán 18 biểu thức tiếng Việt (14 biểu thức ưu tiên + 4 gloss còn lại)
Trong `data/reviews/phase11/semantic-coverage.json` (`vietnamesePolysemyCoverage`), toàn bộ 18 biểu thức tiếng Việt đã được phân tích theo *Từ điển tiếng Việt* (Hoàng Phê):
- **`chạy` (`VI-POLY-001`):** Tách bạch 3 nghĩa quy ước: (V1) di chuyển nhanh bằng chân (`sense-run-movement`), (V2) máy móc/phần mềm chạy (`sense-run-machine`), và (V3) khẩu ngữ *chạy việc / chạy dự án / chạy tội* (cảnh báo bẫy dịch sai nghiêm trọng: tuyệt đối không ánh xạ sang `sense-run-management` = `điều hành`).
- **`hoạt động` (`VI-POLY-002`) vs `vận hành` (`VI-POLY-003`) vs `điều hành` (`VI-POLY-004`):**
  - `hoạt động`: Động từ nội động thuần túy cho máy móc/hệ thống (V1 — khớp với `construction-run-machine`), hoạt động xã hội/tổ chức (V2), và danh từ *activities* (N1). Không nhận tân ngữ trực tiếp.
  - `vận hành`: Động từ kỹ thuật lưỡng khả (ngoại động từ *vận hành máy móc/hệ thống* khớp với `construction-run-machine-transitive`, và nội động từ trang trọng *hệ thống vận hành ổn định*).
  - `điều hành`: Ngoại động từ quản lý tổ chức/doanh nghiệp/dự án (`sense-run-management`).
- **`phân tích` (`VI-POLY-005`) & `mang tính phân tích` (`VI-POLY-017`):** Phân biệt động từ `phân tích` (`analyse`) với cấu trúc danh hóa `sự/quá trình phân tích` (`analysis` [U]) và `bản/bài phân tích` (`analysis` [C]), cùng cụm tính từ `mang tính phân tích` (`analytical`).
- **`to` (`VI-POLY-006`) & `lớn` (`VI-POLY-007`):** Phân tích 4 nghĩa của `lớn` (kích thước vật lý, đại lượng/số lượng, tầm quan trọng, độ tuổi) và giải thích vì sao sự hội tụ `big/large → lớn` gây lỗi giao thoa collocation trong IELTS Writing (`*a large mistake`, `*a big proportion`).
- **`mượn` (`VI-POLY-008`) vs `vay` (`VI-POLY-009`) và `cho mượn` (`VI-POLY-010`) vs `cho vay` (`VI-POLY-011`):** Chứng minh sự phân tách từ vựng hóa bắt buộc trong tiếng Việt theo tính chất đối tượng: đồ vật cụ thể trả lại nguyên chiếc (`mượn / cho mượn`) vs tiền bạc/tài chính trả lại giá trị tương đương (`vay / cho vay`). Đã đóng gói 2 bản ghi ứng viên `equiv-borrow-money` (`vay`) và `equiv-lend-money` (`cho vay`) trong `staged-lexical-candidates.json`.
- **`lời khuyên` (`VI-POLY-012`) vs `lời tư vấn` (`VI-POLY-013`):** Phân tích sự đối lập giữa danh từ đơn vị đếm được `lời` trong tiếng Việt và danh từ không đếm được `advice` trong tiếng Anh.
- **`phụ thuộc vào` (`VI-POLY-014`), `ngân hàng` (`VI-POLY-015`), `bờ sông` (`VI-POLY-016`), `tra cứu` (`VI-POLY-018`):** Đã kiểm tra đầy đủ hành vi cú pháp và giới hạn ngữ cảnh.

### 5.2. Quyết định cho 16/16 bản ghi `TranslationEquivalence`
- Cả **16/16** bản ghi hiện tại đều đủ điều kiện giữ `alignmentMode: "gloss_only"` cho phạm vi xuất bản pilot sau khi thực thi **8 bản sửa `REQUIRED_CORRECTION`** (loại bỏ meta-language và làm rõ phân công ngữ pháp trên `equiv-run-machine-operate`, `equiv-run-machine-operate-alternative`, `equiv-big`, `equiv-large`, `equiv-depend`, `equiv-borrow`, `equiv-lend`).
- Đã đóng gói sẵn **13 bản ghi ứng viên tiếng Việt (`language: "vi"`)** (`entry-vi-chay`, `entry-vi-hoat-dong`, `entry-vi-van-hanh`, `entry-vi-muon`, `entry-vi-vay` và các sense tương ứng) trong `data/reviews/phase11/staged-lexical-candidates.json` làm mẫu chuẩn khi nâng cấp lên `sense_aligned` ở giai đoạn Lexical Production at Scale.

---

## 6. Kiểm Toán Chứng Cứ, Bản Quyền & 10 Phát Hiện Kỹ Thuật (Part D)

### 6.1. Kiểm toán bản quyền nguồn (Rights Verification)
- **Các nguồn thương mại (`SRC-OALD`, `SRC-CAMBRIDGE`, `SRC-COLLINS`, `SRC-BRITISH-COUNCIL`) và các trang tổng hợp chưa xác minh giấy phép (`SRC-VDICT`, `SRC-VNDIC`, `SRC-VTUDIEN`, `SRC-HOANG-PHE-TDTV`):** Giữ nguyên trạng thái `reference_only` (`redistributable: false`). Tuyệt đối không chuyển sang `redistributable`.
- **Các nguồn mở có giấy phép rõ ràng:**
  - `SRC-OEWN` (Open English WordNet 2024): **CC BY 4.0** (`redistributable: true`, yêu cầu ghi công, không yêu cầu ShareAlike).
  - `SRC-PRINCETON-WORDNET-3.1`: **Princeton WordNet License** (`redistributable: true`, yêu cầu giữ thông báo bản quyền).
  - `SRC-WIKTIONARY-EN-VI`: **CC BY-SA 4.0** (`redistributable: true`, nhưng có điều khoản copyleft ShareAlike — cần quyết định của Owner ở Phase 12 trước khi trích dẫn trực tiếp).
- **Trạng thái hiện tại:** `rightsCleared: false` trên toàn bộ batch cho tới khi Phase 12 đăng ký bản ghi `src_` được phép tái phân phối và gắn chứng cứ biên soạn gốc (`evd_`) cho 15 câu ví dụ đang có `examples/0/exampleType: "editorial_original"` (nhưng `examples/0/evidenceIds` hiện đang rỗng `[]`).

### 6.2. Bảng tổng hợp 10 phát hiện kỹ thuật (Technical Findings `TF-01` → `TF-10`)

| Mã | Hạng mục kiểm tra | Phân loại | Vị trí mã nguồn & Nguyên nhân gốc |
| :--- | :--- | :--- | :--- |
| **`TF-01`** | UUIDv7 mapping & evidence value digests | `CONTRACT_GAP` | `pipeline/prepare-batch.mjs#L105-L115` & `validators/validate-dataset-v2.mjs#L35-L40`: `resolveRefs()` đổi `"candidate:..."` sang UUIDv7 nhưng không tính lại `ev.claim.valueDigest` nếu `evd_` trỏ vào trường tham chiếu (`/entryId`, `/senseId`, `/sourceSenseId`, `/familyIds`), gây lỗi `EVIDENCE_CLAIM_MISMATCH`. |
| **`TF-02`** | Candidate evidence binding | `CONTRACT_GAP` | `pipeline/revise-candidates.mjs#L5` khóa cứng `"evidenceIds"` trong tập `forbidden` (`REVISION_FIELD_FORBIDDEN`), trong khi toàn bộ 54 candidates trong `pilot-fanout-002.json` đang có `evidenceIds: []`. Phase 12 cần áp dụng sửa văn bản trước khi sinh và gắn `evd_`. |
| **`TF-03`** | Editorial review stale-value binding | `CONTRACT_GAP` | `schemas/v2/editorial-review.schema.json#L81-L101` & `validators/production-gates.mjs#L131-L135`: `EditorialReview.claims[]` chỉ lưu `{ subjectId, fieldPath }` mà không lưu `valueDigest` (khác với `Evidence.claim` và `phase10-editorial-review-queue.json`). |
| **`TF-04`** | Reviewer authority & AI-only boundary | `EXPECTED_BEHAVIOR` | `validators/authority-v2.mjs#L3-L32`: Yêu cầu callback xác thực bên ngoài (`verifyOwnerAttestation`, `verifyEvidence`, `verifyRights`). Giữ nguyên nguyên tắc fail-closed. |
| **`TF-05`** | Symmetric lexical relation canonicalization | **`CONFIRMED_BUG`** | `pipeline/prepare-batch.mjs#L113-L115` & `validators/graph-v1.mjs#L165-L172`: `prepareBatch()` không sắp xếp lại `[sourceId, targetId]` theo thứ tự ASCII tăng dần sau khi resolve `"candidate:..."` cho các cạnh đối xứng (`SYNONYM_OF`, `NEAR_SYNONYM_OF`, `ANTONYM_OF`), làm rớt `RELATION_NOT_CANONICAL` khi `sourceId > targetId`. |
| **`TF-06`** | Translation review gates cho `gloss_only` vs `sense_aligned` | **`CONFIRMED_BUG`** | `validators/production-gates.mjs#L148-L154`: Kiểm tra `record.translationEvidenceStatus !== "independently_reviewed"` (`TRANSLATION_UNREVIEWED`) và `sourceSenseId` verified bị đặt bên trong `if (record.alignmentMode === "sense_aligned")`, khiến toàn bộ 16 bản ghi `gloss_only` bỏ qua cổng kiểm tra này. |
| **`TF-07`** | Scoped publication dependency closure | `CONTRACT_GAP` | `validators/production-gates.mjs#L68-L86`: Khi truyền `options.subjectIds` ở cấp `sns_`, bao đóng chỉ đi theo `sense.constructionIds` (đang rỗng `[]` trên cả 15 sense) mà bỏ qua liên kết ngược `con.senseId`. |
| **`TF-08`** | Single source of truth `Construction.senseId` | `EXPECTED_BEHAVIOR` | `schemas/v2/construction.schema.json` & `validators/graph-v1.mjs#L90`: `con.senseId` là khóa ngoại bắt buộc duy nhất; `sense.constructionIds` là mảng tùy chọn. |
| **`TF-09`** | Graph integrity khi split/merge senses | `EXPECTED_BEHAVIOR` | `validators/lifecycle-v2.mjs#L1-L145`: Chặn `RETIRED_LIVE_REFERENCE` và `UNREVIEWED_SPLIT_FANOUT` chính xác như thiết kế. |
| **`TF-10`** | Publication fail-closed | `EXPECTED_BEHAVIOR` | `validators/production-gates.mjs` & `pipeline/promote-candidates.mjs`: Luôn trả về `eligible: false` khi thiếu chứng cứ, quyền nguồn hoặc thẩm quyền được xác thực. |

---

## 7. Danh Mục 6 Deliverables Chính Thức Trong Repository (Part E)

Toàn bộ kết quả nghiên cứu Phase 11 đã được hợp nhất vào 6 tệp chuẩn hóa duy nhất trong repository:

1. [`data/reviews/phase11/research-dossier.json`](../data/reviews/phase11/research-dossier.json) — Hồ sơ đánh giá chi tiết 376/376 review items kèm SHA-256 digest, bằng chứng và đối soát.
2. [`data/reviews/phase11/correction-ledger.json`](../data/reviews/phase11/correction-ledger.json) — Sổ cái sửa đổi duy nhất (35 `REQUIRED_CORRECTION`, 14 `RECOMMENDED_IMPROVEMENT`, 3 `DISPUTED`, 16 `INSUFFICIENT_EVIDENCE`, 308 `NO_CHANGE`).
3. [`data/reviews/phase11/semantic-coverage.json`](../data/reviews/phase11/semantic-coverage.json) — Ma trận bao phủ ngữ nghĩa cho 15/15 English senses, synonyms/near-synonyms, antonyms, converse relations, 18 biểu thức tiếng Việt đa nghĩa, 16/16 `TranslationEquivalence` và ánh xạ nhiều-nhiều.
4. [`data/reviews/phase11/staged-lexical-candidates.json`](../data/reviews/phase11/staged-lexical-candidates.json) — 21 bản ghi ứng viên (`draft`) đã nghiên cứu đầy đủ chứng cứ (gồm `entry-small`, `sense-small-size`, `equiv-small`, `rel-big-large-near-synonym`, `rel-big-small-antonym`, `rel-large-small-antonym`, `equiv-borrow-money`, `equiv-lend-money` và 13 bản ghi đồ thị tiếng Việt).
5. [`data/reviews/phase11/phase12-handoff.json`](../data/reviews/phase11/phase12-handoff.json) — Hồ sơ bàn giao kỹ thuật duy nhất cho Codex thực thi Phase 12–13.
6. [`docs/phase11-closure.md`](phase11-closure.md) — Báo cáo tổng kết và đóng Phase 11 chính thức.

---

## 8. Ranh Giới Triển Khai Phase 12–13 & Kết Luận Cuối Cùng (Final Verdict)

- **Những việc duy nhất còn thuộc Phase 12–13 (dành cho Codex & Lead Architect):**
  1. Vá 2 lỗi `CONFIRMED_BUG` (`TF-05` trong `pipeline/prepare-batch.mjs`, `TF-06` trong `validators/production-gates.mjs`) và các `CONTRACT_GAP` (`TF-01`, `TF-02`, `TF-03`, `TF-07`).
  2. Áp dụng 35 mục `REQUIRED_CORRECTION` (và các mục `RECOMMENDED_IMPROVEMENT` được chọn) từ `data/reviews/phase11/correction-ledger.json`, cùng các ứng viên thuộc phạm vi pilot trong `data/reviews/phase11/staged-lexical-candidates.json`.
  3. Giải quyết `P10-ISSUE-rights-sources` bằng cách đăng ký nguồn mở được phép phân phối lại (`SRC-OEWN`, `SRC-PRINCETON-WORDNET-3.1`) và nguồn biên soạn gốc (`SRC-IELTS-TRADITION-EDITORIAL-V1`), giữ nguyên `exampleType: "editorial_original"` trên 15 câu ví dụ đồng thời gắn chứng cứ nguồn biên soạn gốc, và sinh đầy đủ bản ghi `evd_`.
  4. Ghi nhận quyết định của Owner/Architect đối với `P10-ISSUE-bank-boundary` (`homographNumber: 1` vs `2`) và chạy nghiệm thu xuất bản cuối cùng tại Phase 13.

- **Verdict:**
  - **Phase 11 Research Status:** `PASS` — **`PHASE_11_AI_RESEARCH_COMPLETE`**
  - **Publication Readiness Status:** **`NOT READY`** (`publicationEligible: false` cho đến khi hoàn tất Phase 12–13).
