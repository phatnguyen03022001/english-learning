# Phase 10 — Hồ sơ chuẩn bị thẩm định biên tập độc lập

## 1. Tóm tắt điều hành

Hồ sơ này chuẩn bị việc thẩm định độc lập cho snapshot `pilot-fanout-002`. Đây là gói giao việc, không phải quyết định biên tập hay phê duyệt xuất bản. Toàn bộ 54 candidate vẫn ở trạng thái draft; chưa có reviewer được bổ nhiệm, quyết định con người, xác thực evidence, rights clearance hoặc publication approval.

| Chỉ số | Giá trị |
|---|---:|
| Batch | `pilot-fanout-002` |
| SHA-256 snapshot | `d203048c769d6e033f219dc58531d3db9c87c59a00ec8482f9748a3005cab805` |
| Candidate records | 54 |
| Learner-facing claims theo publicationClaimPaths | 372 |
| Review items (claim paths + scoped semantic issues) | 376 |
| Editorial review | Chưa bắt đầu |
| Publication eligibility | `false` |

## 2. Batch inventory

| Candidate type | Số lượng |
|---|---:|
| LexicalEntry | 13 |
| LexicalSense | 15 |
| Construction | 9 |
| TranslationEquivalence (gloss-only) | 16 |
| WordFamily | 1 |

Coverage được lập bằng `candidateId + candidate-relative fieldPath`. Field path hiện tại bắt đầu từ `/entity`; vị trí record trong mảng không phải identity. Tất cả 15 English examples và 15 bản dịch tiếng Việt được liệt kê riêng ở mục 7.

## 3. Thay đổi sau Phase 8

Phase 8 đánh giá 232 assertions trên snapshot 001. Phase 9 có correction cho snapshot 002 và bổ sung một construction candidate; do đó Phase 8 status không được kế thừa như phê duyệt cho giá trị hiện tại.

| Phân loại claim | Số lượng |
|---|---:|
| UNCHANGED | 301 |
| MODIFIED | 12 |
| NEW | 9 |
| REMOVED | 0 |
| REQUIRES_REASSESSMENT | 50 |
| Tổng learner-facing claim paths hiện tại | 372 |

Các nhóm trên là phân loại loại trừ lẫn nhau cho 372 claim paths hiện tại. 50 claim paths được đánh dấu reassessment vì tình trạng/quan hệ evidence và semantic dependency đòi hỏi thẩm định lại; chúng không được cộng thêm vào mẫu số. 12 modified + 9 new không thừa hưởng assessment như thể assessment áp dụng cho giá trị mới. 0 removed có nghĩa không có claim path cũ bị bỏ khỏi inventory enumeration sau khi ghép bằng candidate ID và relative path.

Phase 9 liên kết 10 correction items với các claim và issue liên quan. Snapshot 001, dossier Phase 8 và ledger Phase 9 được giữ nguyên. Assessment IDs và source IDs là tham chiếu nghiên cứu, không phải authenticated V2 Evidence records.

| Phase 9 item | Candidate / phạm vi | Liên kết trong queue | Trạng thái |
|---|---|---|
| COR-001 | sense-analysis | P10-sense-analysis-entity-grammar-countability, P10-sense-analysis-entity-usageNote | PENDING_HUMAN_REVIEW |
| COR-002 | construction-borrow-from | P10-construction-borrow-from-entity-grammar-requiredPrepositions | PENDING_HUMAN_REVIEW |
| COR-003 | sense-run-machine; sense-run-machine, construction-run-machine, construction-run-machine-transitive | P10-sense-run-machine-entity-grammar-transitivity, P10-sense-run-machine-entity-usageNote, P10-ISSUE-run-boundary | PENDING_HUMAN_REVIEW |
| COR-004 | sense-run-machine; construction-run-machine; sense-run-machine, construction-run-machine, construction-run-machine-transitive | P10-sense-run-machine-entity-usageRestrictions-0-description, P10-construction-run-machine-entity-constraints-0, P10-construction-run-machine-entity-constraints-1, P10-ISSUE-run-boundary | PENDING_HUMAN_REVIEW |
| COR-005 | sense-analyse | P10-sense-analyse-entity-definition | PENDING_HUMAN_REVIEW |
| COR-006 | sense-analytical | P10-sense-analytical-entity-definition | PENDING_HUMAN_REVIEW |
| COR-007 | entry-bank-financial; entry-bank-financial, entry-bank-river | P10-entry-bank-financial-entity-homographNumber, P10-ISSUE-bank-boundary | PENDING_HUMAN_REVIEW |
| COR-008 | equiv-run-machine-operate; equiv-run-machine-operate-alternative | P10-equiv-run-machine-operate-entity-restrictions-0, P10-equiv-run-machine-operate-alternative-entity-restrictions-1 | PENDING_HUMAN_REVIEW |
| COR-009 | equiv-large | P10-equiv-large-entity-restrictions-1 | PENDING_HUMAN_REVIEW |
| COR-010 | family-analysis; family-analysis, entry-analyse, entry-analysis, entry-analytical | P10-family-analysis-entity-familyBasis, P10-ISSUE-analysis-family | PENDING_HUMAN_REVIEW |

## 4. Câu hỏi thẩm định từ điển học

**Vai trò:** Lead Lexicographic Reviewer. Cần người được owner bổ nhiệm với phạm vi từ điển học được xác thực độc lập.

| Vấn đề | Candidate | Câu hỏi và lựa chọn cần cân nhắc | Tác động |
|---|---|---|---|
| Ranh giới *bank* | `entry-bank-financial`, `entry-bank-river` và senses tương ứng | Tách thành hai entry, giữ chung entry với senses, hay xem numbering là cách trình bày? Có căn cứ nào cho homograph numbering? | Quyết định sớm có thể làm sai route sense, equivalence và identity. |
| Ranh giới *run* | `sense-run-machine`, `construction-run-machine`, `construction-run-machine-transitive` | Intransitive machine functioning và transitive run a machine/program thuộc cùng sense hay hai senses? Kiến trúc sense và construction hiện tại có bảo toàn khác biệt? | Learner có thể dùng sai valency hoặc hiểu sai nghĩa. |
| Nhóm *analyse / analysis / analytical* | `family-analysis`, ba entries/senses | Các thành viên có tạo thành family đồng đại có căn cứ không? Có directed derivational relation nào được chứng minh riêng không? Không suy ra quan hệ từ spelling. | Sai family relation gây suy luận hình thái/ngữ nghĩa không đúng. |
| Definitions và polysemy | 15 senses; xem danh sách trong queue theo từng claim | Definition bao phủ đúng meaning, process/result, register và topic không? Khác biệt nào thuộc sense, khác biệt nào nên biểu diễn bằng construction/usage? | Definition hẹp hoặc nhập nhằng ảnh hưởng trực tiếp việc học. |

Đề xuất trong queue chỉ là câu hỏi và các phương án ACCEPT/REJECT/REVISE/DEFER, không phải outcome. Mọi quyết định cần rationale nêu alternatives, evidence location/limits và downstream learner/identity impact.

## 5. Câu hỏi ngữ pháp và cách dùng tiếng Anh

**Vai trò:** Grammar & English Usage Reviewer. Phạm vi gồm đủ 9 constructions, grammar của sense-level, và tính tự nhiên của mọi English example.

| Candidate | Pattern hiện tại | Trọng tâm review |
|---|---|---|
| construction-run-machine | run (of a machine or system) | {"transitivity":"intransitive","complementTypes":[],"separability":"not_applicable"} |
| construction-run-management | run + NP | {"transitivity":"transitive","complementTypes":["noun_phrase"],"separability":"not_applicable"} |
| construction-analyse-object | analyse + NP | {"transitivity":"transitive","complementTypes":["noun_phrase"],"separability":"not_applicable"} |
| construction-depend-on | depend on + NP | {"transitivity":"intransitive","complementTypes":["prepositional_phrase"],"requiredPrepositions":["on"],"separability":"not_applicable"} |
| construction-look-up-separable | look up + NP / look + NP + up | {"transitivity":"transitive","complementTypes":["noun_phrase"],"pronounPlacement":"before_particle","separability":"separable"} |
| construction-borrow-from | borrow + NP (+ from + NP) | {"transitivity":"transitive","complementTypes":["noun_phrase","prepositional_phrase"],"requiredPrepositions":[],"separability":"not_applicable"} |
| construction-lend-double-object | lend + recipient + thing | {"transitivity":"transitive","complementTypes":["noun_phrase"],"separability":"not_applicable"} |
| construction-lend-to | lend + thing + to + recipient | {"transitivity":"transitive","complementTypes":["noun_phrase","prepositional_phrase"],"requiredPrepositions":["to"],"separability":"not_applicable"} |
| construction-run-machine-transitive | run + NP (machine or program) | {"transitivity":"transitive","complementTypes":["noun_phrase"],"separability":"not_applicable"} |
Ưu tiên quyết định:

- **analysis:** xác nhận count/noncount uses và contextual process/result distinction; không tự chia sense chỉ theo bản dịch.
- **borrow:** kiểm tra direct object và source complement tùy chọn; `from` không phải preposition bắt buộc của mọi cách dùng và borrower vẫn là người nhận/mượn.
- **run:** đối chiếu transitivity ở sense level với từng construction; không làm mất intransitive frame, đồng thời review construction transitive mới theo exact scope.
- **depend on:** xác nhận `on` là thành phần của frame và vai trò bổ ngữ.
- **look up:** xác nhận separability, vị trí đại từ và frame.
- **advice:** xác nhận countability, collocation và ví dụ.

Tất cả English examples ở mục 7 cần reviewer usage xác nhận idiomaticity, collocation, register và learner usefulness.

## 6. Câu hỏi song ngữ Anh–Việt

**Vai trò:** English–Vietnamese Bilingual Reviewer. Cả 16 equivalences dưới đây vẫn là gloss-only; không gloss nào được chuyển thành sense-aligned trong hồ sơ này.

| Candidate | Gloss hiện tại | Context / restriction hiện có | Câu hỏi cần trả lời |
|---|---|---|---|
| equiv-bank-financial | ngân hàng (approximate; gloss_only) | financial institution and financial-services context; not a Vietnamese target sense; not applicable to the river-edge homograph |
| equiv-bank-river | bờ sông (approximate; gloss_only) | land along the side of a river; not a Vietnamese target sense; not applicable to the financial homograph |
| equiv-run-movement | chạy (approximate; gloss_only) | physical movement on foot; chạy bộ is retained only as a possible exercise-specific variant; not applicable to machine operation or management |
| equiv-run-machine-operate | hoạt động (approximate; gloss_only) | intransitive machine or system functioning; candidate contextual gloss for intransitive machine/system functioning; preference relative to “vận hành” remains pending independent bilingual review; not a universal technical equivalent |
| equiv-run-machine-operate-alternative | vận hành (approximate; gloss_only) | technical or operator-oriented wording for machine/system operation; unresolved bilingual alternative; candidate operator-oriented alternative; preference relative to “hoạt động” remains pending independent bilingual review |
| equiv-run-management | điều hành (approximate; gloss_only) | manage an activity, organization, or business; not applicable to physical movement or machine operation |
| equiv-analyse | phân tích (approximate; gloss_only) | examine data, results, or issues in detail;  |
| equiv-analysis | phân tích (approximate; gloss_only) | noun referring to a process or a report/result; sự phân tích may fit a process; bản phân tích may fit a report or result |
| equiv-analytical | mang tính phân tích (approximate; gloss_only) | modifying an approach, method, or way of thinking; does not create a Vietnamese target sense; does not make the adjective interchangeable with the noun or verb |
| equiv-big | lớn (approximate; gloss_only) | physical size; shared gloss with large does not establish unrestricted substitution; big sister and other collocations remain outside this candidate |
| equiv-large | lớn (approximate; gloss_only) | physical size or extent; shared gloss with big does not establish unrestricted substitution; collocational differences remain pending review |
| equiv-depend | phụ thuộc vào (approximate; gloss_only) | conditional or contingent relation with depend on + NP; does not cover the unresolved reliance/support sense |
| equiv-look-up | tra cứu (approximate; gloss_only) | search for information in a reference source; look it up is a construction variant, not a separate target sense |
| equiv-borrow | mượn (approximate; gloss_only) | temporarily receive and use a non-money item; money-related vay remains a separate review question; subject is the recipient/user, not the provider |
| equiv-lend | cho mượn (approximate; gloss_only) | temporarily provide a non-money item; money-related cho vay remains a separate review question; subject is the provider, not the recipient |
| equiv-advice | lời khuyên (approximate; gloss_only) | guidance or recommendation; lời tư vấn is retained only as a possible consultation/service variant; not a Vietnamese target sense |

Ưu tiên: *run* — `hoạt động` và `vận hành`; *borrow/lend* — vai người nhận và người cho; *analysis* — `sự phân tích` hay `bản phân tích`; *big/large* — giới hạn thay thế theo ngữ cảnh; *advice* — `lời khuyên` hay `lời tư vấn`. Với từng gloss cần nêu context phù hợp, context không áp dụng và false-equivalence risk. Không suy ra equivalence chính xác chỉ từ gloss chung.

## 7. Checklist examples và bản dịch

Review đủ từng cặp dưới đây: câu tiếng Anh có idiomatic không, thể hiện đúng sense/frame/register không; bản dịch có giữ nghĩa, vai ngữ nghĩa và sắc thái không; ví dụ có nguyên bản, được phép tái sử dụng trong phạm vi dự kiến và không sao chép nguồn thương mại không.

| Candidate | English example | Vietnamese translation |
|---|---|---|
| sense-bank-financial | She opened an account at the bank. | Cô ấy mở một tài khoản tại ngân hàng. |
| sense-bank-river | They rested on the river bank. | Họ nghỉ bên bờ sông. |
| sense-run-movement | He runs every morning. | Anh ấy chạy mỗi buổi sáng. |
| sense-run-machine | The engine runs quietly. | Động cơ hoạt động êm. |
| sense-run-management | She runs a small design studio. | Cô ấy điều hành một studio thiết kế nhỏ. |
| sense-analyse | The researchers analysed the survey results. | Các nhà nghiên cứu phân tích kết quả khảo sát. |
| sense-analysis | The report contains an analysis of the results. | Báo cáo có một bản phân tích kết quả. |
| sense-analytical | The course develops analytical thinking. | Khóa học phát triển tư duy phân tích. |
| sense-big-size | They live in a big house. | Họ sống trong một ngôi nhà lớn. |
| sense-large-size | The museum has a large entrance hall. | Bảo tàng có một sảnh vào lớn. |
| sense-depend-contingent | The final result depends on the weather. | Kết quả cuối cùng phụ thuộc vào thời tiết. |
| sense-look-up-reference | Please look up the word in a dictionary. | Hãy tra cứu từ đó trong từ điển. |
| sense-borrow-temporary-use | I borrowed a book from Lan. | Tôi mượn một cuốn sách của Lan. |
| sense-lend-temporary-use | Lan lent me a book. | Lan cho tôi mượn một cuốn sách. |
| sense-advice-guidance | She gave me some useful advice. | Cô ấy cho tôi một lời khuyên hữu ích. |

## 8. Checklist evidence, rights và data integrity

**Vai trò:** Evidence, Rights & Data Integrity Reviewer.

- Với mỗi source ID: xác nhận nguồn/edition và vị trí cụ thể hỗ trợ đúng claim, phạm vi ngữ cảnh, evidence mâu thuẫn và tính độc lập.
- Đánh giá tách biệt bốn điều: **có thể truy cập công khai**, **phù hợp làm tài liệu tham khảo**, **đã được kiểm chứng độc lập**, **được cấp phép tái phân phối**. Một điều không chứng minh điều khác.
- Kiểm tra quyền dùng lại cho nội dung nguồn; nguồn từ điển được trích dẫn để tham khảo không đồng nghĩa được phép sao chép wording.
- Xác nhận English examples là editorial-original hay external; xác định author/provenance, rights basis và reuse scope.
- Xác nhận batch ID, digest, candidate IDs và toàn vẹn candidate references. Không gán canonical identity, sourceItemKey hoặc approval.
- Xác thực riêng authority và phạm vi bổ nhiệm reviewer. Git commit author không chứng minh authority.
- Queue item `P10-ISSUE-rights-sources` gom phạm vi nguồn của batch; queue vẫn giữ claim-level evidence references tại từng field.

## 9. Yêu cầu quyết định chính xác

Mỗi reviewer trả lời theo từng `reviewItemKey` hoặc issue key:

1. Chọn một phương án **ACCEPT**, **REJECT**, **REVISE** hoặc **DEFER**; đây chỉ là các option cho người review.
2. Viết rationale claim-specific, chỉ đúng candidate + relative field path hoặc semantic issue.
3. Ghi source, edition, exact location/URL, ngày truy cập nếu phù hợp, claim được hỗ trợ và limitation/counterevidence.
4. Với REVISE, đưa wording/metadata đề xuất và chỉ rõ ngữ cảnh áp dụng.
5. Ghi learner impact và các claim phụ thuộc phải xem lại.
6. Không đánh dấu verified nếu chưa đáp ứng workflow, evidence provenance, rights và authority requirements.

Queue chỉ tạo placeholder pending; không chứa reviewer identity, appointment, timestamp, accepted decision hoặc verified attestation.

## 10. Blockers còn mở

- Chưa có reviewer appointments và scope authority được xác thực.
- Chưa có claim-specific independent human decisions; Phase 8 assessments không thể kế thừa như quyết định cho snapshot 002.
- Evidence chưa được chuyển/kiểm chứng thành V2 Evidence records; exact locations, source independence và counterevidence cần đối chiếu.
- Rights/license clearance và intended reuse scope chưa được cấp.
- Gloss-only translations, đặc biệt các cặp nêu trên, cần bilingual decisions.
- Các ranh giới bank/run/family còn pending.
- Candidate records còn draft; publication gate tiếp tục fail-closed (`publicationEligible: false`).
