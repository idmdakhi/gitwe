# gitwe TODO

آخرین بروزرسانی: ۲۰۲۶-۰۸-۱۷  
نسخه فعلی: **۱.۰.۰**

این فایل، مرجع واحد کارهای برنامه‌ریزی‌شده است.  
موارد بر اساس اولویت و نسخه هدف دسته‌بندی شده‌اند.  
چک‌باکس‌ها در Pull Requestها علامت زده می‌شوند؛ لطفاً فایل را به‌روز نگه دارید.

موارد مربوط به برابری ویژگی (parity) با سه پروژه پیشین، با نام آنها مشخص شده‌اند:

- **nvie/gitflow** — <https://github.com/nvie/gitflow> (اسکریپت اصلی git‑flow، بایگانی شده)
- **gitflow-avh** — <https://github.com/petervanderdoes/gitflow-avh> (جانشین اجتماعی، بایگانی شده)
- **git-flow-next** — <https://github.com/gittower/git-flow-next> (پیاده‌سازی Go فعال از Tower، سازگار با دو مورد بالا)

---

## راهنما

| اولویت | معنی                                           |
| ------ | ---------------------------------------------- |
| **P0** | بلوکه‌کننده / باید پیش از نسخه بعدی اصلاح شود  |
| **P1** | ارزش بالا برای نسخه فرعی بعدی (۱.۱)            |
| **P2** | قابلیت‌های مهم برای نسخه ۱.۲                   |
| **P3** | خوب است که داشته باشیم / برای بعد (۱.۳ به بعد) |

| وضعیت | معنی                  |
| ----- | --------------------- |
| `[ ]` | شروع نشده             |
| `[~]` | در حال انجام          |
| `[x]` | انجام شده             |
| `[-]` | لغو / به تعویق افتاده |

---

## P0 – فوری (۱.۰.x / اوایل ۱.۱)

### ۱. ممیزی مرزهای معماری (P0.1)

قانون اصلی (قبلاً در [`ARCHITECTURE.md`](../ARCHITECTURE.md) آمده):
**`domain` و `application` هرگز نباید `infrastructure` را import کنند.**  
این قانون در حال حاضر فقط با توافق و بازبری رعایت می‌شود، نه با ابزار – و یک ممیزی دستی قبلاً یک نقض زنده پیدا کرده است.  
دامنه: ابتدا ممیزی و یکسان‌سازی، **نه** بازنویسی کورکورانه؛ فقط پس از تکمیل لیست مرجع زیر، کد را تغییر دهید.

- [x] **P0.1-A – ممیزی وابستگی.**  
      در `src/domain/**` و `src/application/**` برای هر مسیر وارداتی شامل `../infrastructure/`، `../../infrastructure/` یا `src/infrastructure/` جستجو کنید؛ هر مورد را به‌عنوان نقض P0 ثبت کنید.  
      **تأیید شده:** `src/application/use-cases/init-workflow.use-case.ts` از `../../domain/config/presets.js` استفاده می‌کند – یک نقض مستقیم `application → infrastructure`.

- [ ] **P0.1-B – ممیزی نمادهای تکراری.**  
      دو پیاده‌سازی Preset هم‌اکنون کنار هم وجود دارند:
  - `src/infrastructure/config/presets.ts` – قدیمی، همچنان توسط `InitWorkflowUseCase` استفاده می‌شود.
  - `src/domain/config/presets.ts` – جدیدتر، صادرکننده‌های `PresetName`، `PresetOverrides`، `createPreset()`، `getAvailablePresets()`، `isPresetName()`، `PRESET_NAMES`؛ قبلاً توسط دستور `init` CLI استفاده می‌شود.  
    کل درخت کد را برای هر یک از: `domain/config/presets`، `PresetName`، `PresetOverrides`، `createPreset`، `getAvailablePresets`، `isPresetName`، `presets[` جستجو کرده و تمام فراخوان‌ها را قبل از هر تغییری ثبت کنید.

- [ ] **P0.1-C – ممیزی معماری قدیمی.**  
      با همان الگوی P0.1-A، بررسی کنید که آیا فایل دیگری در `infrastructure/` وجود دارد که کد domain/application مستقیماً به آن دسترسی دارد (غیر از Presets).

- [ ] **P0.1-D – نقشه فایل‌های معیار.**  
      برای هر نماد تکراری، تصمیم بگیرید که کدام پیاده‌سازی منبع حقیقت است. تصمیم فعلی: `src/domain/config/presets.ts` معیار است.

- [ ] **P0.1-E – برنامه مهاجرت.**  
      فهرستی صریح از `DELETE` / `MOVE` / `MERGE` / `KEEP` / `RENAME` تهیه کنید.  
      import `InitWorkflowUseCase` از `infrastructure/config/presets` به `domain/config/presets` منتقل می‌شود – اما فقط پس از اتمام P0.1-A/B/C.

- [ ] **P0.1-F – تست‌های مرزی.**  
      یک قانون lint یا اسکریپت کوچک (که در CI اجرا شود) اضافه کنید که در صورت وارد کردن `infrastructure/**` در `domain/**` یا `application/**`، build را fail کند. تا زمانی که این کار انجام نشود، قانون مرز در `ARCHITECTURE.md` آرزویی است، نه الزامی.

| مرز                              | وضعیت | اقدام                                                |
| -------------------------------- | ----- | ---------------------------------------------------- |
| `domain` → `infrastructure`      | 🔴    | ممیزی کامل در انتظار (P0.1-A/C)                      |
| `application` → `infrastructure` | 🔴    | حداقل `InitWorkflowUseCase` (P0.1-A)                 |
| پیاده‌سازی تکراری Preset         | 🔴    | یکسان‌سازی روی `domain/config/presets.ts` (P0.1-B/D) |
| `cli` → `application`            | 🟢    | OK                                                   |
| `application` → `domain`         | 🟢    | OK                                                   |
| `infrastructure` → `domain`      | 🟢    | جهت مورد انتظار                                      |
| `Engine` به‌عنوان facade         | 🟢    | طراحی فعلی صحیح است                                  |
| Use caseها در `application`      | 🟢    | طراحی فعلی صحیح است                                  |

---

### ۲. بهداشت CI و انتشار

- [ ] فعال‌سازی مجدد jobهای غیرفعال (`if: false`) در:
  - `.github/workflows/ci.yaml`
  - `.github/workflows/e2e.yaml`
  - `.github/workflows/nightly.yaml`
  - `.github/workflows/release.yaml`
  - بخش‌های مرتبط `.github/workflows/publish.yaml`

- [ ] یکسان‌سازی نسخه Node.js در `action.yaml`، `package.json` و همه workflowها (ترجیحاً ماتریس ۲۰، ۲۲، ۲۴).

- [ ] بهبود کش `node_modules` و `dist` در action کامپوزیت و `action.yaml`.

- [ ] بررسی اینکه ماتریس `publish.yaml` (npm + GitHub Packages) پس از بازنویسی ۱.۰ همچنان کار می‌کند.

- [ ] **رفع entrypoint در `action.yaml`.**  
      در حال حاضر `${{ github.action_path }}/dist/cli/index.js` را اجرا می‌کند، اما `package.json#bin` به `./dist/cli/program.js` اشاره دارد؛ فایلی که Action فراخوانی می‌کند پس از `npm run build` وجود ندارد. این موضوع استفاده از Action ریشه را مسدود می‌کند.

- [ ] **هم‌راستا کردن سطح دستورات `action.yaml` با CLI بازنویسی‌شده.**  
      در حال حاضر flagها/دستوراتی (`--json`، `--workflow`، `--no-delete`، `--abort-on-conflict`، `--strategy`، `status --root`، `graph`، `doctor`، `config`) ارسال می‌شوند که مربوط به قبل از بازنویسی هستند و در `src/cli/program.ts` وجود ندارند. یا آنها را پیاده‌سازی کنید یا ورودی‌های Action را به ۹ دستور موجود کاهش دهید.

- [ ] **هم‌راستا کردن `.github/workflows/e2e.yaml`.**  
      این فایل نیز به `dist/cli/index.js` و flagهای قبل از بازنویسی (`--defaults`، `doctor --format json`، `finish --keep`) اشاره دارد؛ به محض برداشتن `if: false` به دلایل مشابه دو مورد بالا شکست خواهد خورد.

---

### ۳. سازگاری خروجی و CLI

- [ ] اضافه کردن `schemaVersion: 1` به تمام پاسخ‌های JSON (طبق RFC-0004).

- [ ] در دسترس قرار دادن `--format json|yaml|table` برای `start`، `finish`، `list`، `version`، `config list`، `doctor` و `overview`. (زیرساخت envelope/format در `cli/output.ts` / `cli/options.ts` وجود دارد، اما هیچ دستوری از آن استفاده نمی‌کند).

- [ ] در نظر گرفتن `--json` به‌عنوان نام مستعار منسوخ برای `--format json`.

---

### ۴. بهبود تجربه خطا

- [ ] بازبینی و بهبود رشته‌های `hint` در `domain/errors/index.ts` و گزارش‌گر CLI.

- [ ] اطمینان از اینکه `ConflictError` همیشه فایل‌های دقیق و دستور ادامه یا لغو را نشان می‌دهد.

- [ ] اضافه کردن بخش "مشکلات رایج" به `docs/commands.md`.

---

### ۵. کیفیت کد

- [ ] انجام ممیزی مرزهای معماری (P0.1) – این موارد جایگزین نکته قبلی "مرزهای لایه‌ای را تمیز نگه دارید" می‌شود.

- [ ] حذف یا ترجمه نظرات فارسی باقی‌مانده در لایه domain تا کدbase یکنواخت انگلیسی باشد.

- [ ] افزایش پوشش تست `ShellGitRepository` (به‌ویژه conflict، rebase در حال اجرا، remote缺失 و مسیرهای Windows) – در حال حاضر هیچ تستی در `tests/infrastructure/` وجود ندارد.

- [ ] پشتیبانی از متغیر محیطی `GITWE_CONFIG` به‌عنوان جایگزین `--config`.

---

### ۶. بهداشت مستندات

- [x] اضافه کردن صفحه "استفاده از gitwe در CI" با کدهای قابل کپی برای GitHub Actions و GitLab CI. (`docs/using-in-ci.md` وجود دارد و با دستورات پیاده‌سازی‌شده هماهنگ است).

- [ ] همگام نگه داشتن `docs/ARCHITECTURE.md`، `docs/development/testing.md`، `docs/structure.md` و `docs/commands.md` هر زمان که `src/cli/program.ts` دستوری اضافه یا حذف کند – این چهار فایل در ۲۰۲۶-۰۸-۱۶ از نو نوشته شدند زیرا از کد فاصله گرفته بودند.

---

## P1 – ۱.۱ (تجربه توسعه‌دهنده و پایداری)

### ۷. دستور doctor (RFC-0003)

- [ ] پیاده‌سازی `gitwe doctor` (فقط گزارش). توجه: `src/cli/commands/doctor.ts` از قبل روی دیسک وجود دارد اما در `program.ts` وارد نشده است – ابتدا بررسی کنید که آیا با API فعلی `Engine`/use-case قابل استفاده است یا نیاز به بازنویسی دارد.

- [ ] پیاده‌سازی `gitwe doctor --fix` با قوانین ایمنی تعریف‌شده در RFC.

- [ ] اضافه کردن خروجی JSON/YAML برای doctor.

- [ ] اتصال doctor به GitHub Action به‌عنوان مرحله اختیاری ابتدایی.

---

### ۸. بهبود overview و status

- [ ] اضافه کردن `--format table` به `overview`.

- [ ] نمایش وضعیت ahead/behind نسبت به remote tracking (در صورت وجود).

- [ ] نمایش هشدار واضح‌تر "operation in progress" در صورت وجود `.gitwe/state.json`.

---

### ۹. تست

- [ ] گسترش E2E برای پوشش حداقل یک سناریوی conflict + `--continue` و یک سناریوی `--abort` (موضوع به هم‌راستایی `action.yaml`/e2e در P0 بستگی دارد).

- [ ] اضافه کردن یک fixture bare-remote که در تست‌های موتور بیشتری استفاده شود.

- [ ] تست‌های snapshot برای شکل جدید JSON.

---

### ۱۰. مستندات

- [ ] نوشتن دیاگرام کامل چرخه‌ی حیات finish state machine (نسخه متنی در `docs/ARCHITECTURE.md#the-resumable-finish-operation` موجود است؛ دیاگرام هنوز باز است).

- [ ] مستند کردن ترتیب جستجوی فایل‌های config و اولویت `--config` / `GITWE_CONFIG`.

---

### ۱۱. ویژگی‌های کوچک

- [ ] `gitwe version --json`

- [ ] افزودن `tagFormat` اختیاری به workflow (جایگزینی ساده، مثلاً `v{{name}}`).

- [ ] `gitwe config validate` (متمایز از `gitwe validate` موجود؛ این یکی به `gitwe config` اجازه می‌دهد قبل از نوشتن، تغییرات پیشنهادی را پیش‌نمایش دهد).

---

## P2 – ۱.۲ (قابلیت‌های پیشرفته)

### ۱۲. چند ریموت (RFC-0001)

- [ ] افزودن نوع‌های دامنه و parser برای شکل جدید `remote` (شیء).

- [ ] توابع کمکی در `WorkflowService` برای حل remote.

- [ ] تغییرات موتور برای `publish` و مرحله push در `finish`.

- [ ] اضافه کردن flags CLI `--remote` / `--push-to`.

- [ ] پوشش کامل تست و مستندات.

---

### ۱۳. استراتژی‌های جدید finish (RFC-0002)

- [ ] گسترش نوع `MergeStrategy` با `cherry-pick` و `rebase-merge`.

- [ ] پیاده‌سازی هر دو مسیر در `FinishBranchUseCase` با پشتیبانی از conflict و resume.

- [ ] اضافه کردن flags اختیاری `--cherry-pick` / `--rebase-merge`.

- [ ] تست‌ها و به‌روزرسانی مستندات.

---

### ۱۴. برابری با nvie/gitflow / gitflow-avh / git-flow-next

| ویژگی                                                                                                    | منبع                              | وضعیت در gitwe                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| انواع شاخه‌های موضوعی دلخواه (feature/release/hotfix/support/…)                                          | nvie/gitflow, AVH                 | **دارد** – هر ورودی `branchTypes` در تعریف workflow بلافاصله به `gitwe start/finish <type>` تبدیل می‌شود.                                                                                                                                                                                                                                              |
| `publish` (push + تنظیم upstream)                                                                        | nvie/gitflow, AVH                 | **دارد** – `gitwe publish`.                                                                                                                                                                                                                                                                                                                            |
| `track` (ایجاد شاخه محلی برای ردیابی یک شاخه راه‌دور موجود)                                              | nvie/gitflow, AVH                 | [ ] متصل نشده. `src/cli/commands/track.ts` روی دیسک وجود دارد؛ نیاز به `Engine`/use-case و اتصال مجدد به `program.ts`.                                                                                                                                                                                                                                 |
| `pull` (fetch + track، در upstream به نفع `track` منسوخ شده)                                             | nvie/gitflow, AVH                 | [-] عمداً برنامه‌ریزی نشده – مستقیماً به `track` بروید، مطابق با جایی که upstream به پایان رسید.                                                                                                                                                                                                                                                       |
| `-k`/`--keep` (نگه‌داشتن شاخه پس از finish)                                                              | nvie/gitflow, AVH                 | [ ] پیاده‌سازی نشده. به‌عنوان بخشی از "flagهای غنی‌تر finish" در زیر پیگیری می‌شود.                                                                                                                                                                                                                                                                    |
| `rename <new-name>`                                                                                      | AVH                               | [ ] متصل نشده. `src/cli/commands/rename.ts` روی دیسک وجود دارد؛ نیاز به اتصال مجدد، مشابه `track`.                                                                                                                                                                                                                                                     |
| `allowdirty` (شروع از working tree کثیف در صورت تنظیم)                                                   | AVH                               | [ ] پیاده‌سازی نشده – به‌عنوان یک فیلد اختیاری `start.allowDirty` در تعریف workflow اضافه کنید.                                                                                                                                                                                                                                                        |
| `--showcommands` / لاگ‌گیری verbose از دستورات git                                                       | AVH                               | **دارد** – `-v, --verbose` در برنامه سراسری.                                                                                                                                                                                                                                                                                                           |
| انتخاب push یا نه برای شاخه‌ها/تگ‌های تحت تأثیر `finish`                                                 | AVH                               | **دارد** – `gitwe finish --push` (پیش‌فرض خاموش).                                                                                                                                                                                                                                                                                                      |
| رفع: خطای حذف شاخه راه‌دوری که قبلاً حذف شده است                                                         | AVH                               | [ ] تأیید کنید که `ShellGitRepository.deleteRemoteBranch` به‌خوبی خطا را مدیریت می‌کند؛ در غیر این صورت تست رگرسیون اضافه کنید.                                                                                                                                                                                                                        |
| دستورات خلاصه‌شده که نوع موضوع را از شاخه فعلی استنباط می‌کنند (`git flow finish`, `git flow rebase`)    | git-flow-next                     | **دارد**، به‌شکل متفاوت – `gitwe finish`/`update`/`publish`/`delete` از قبل `[name]` را به شاخه فعلی پیش‌فرض می‌گیرند؛ gitwe هرگز نیازی به دستور خلاصه‌شده استنباط نوع نداشت زیرا دستورات آن در CLI بر اساس نوع فضای نام ندارند.                                                                                                                       |
| بررسی همگام‌سازی با ریموت قبل از `finish` (محلی باید با ریموت به‌روز باشد)                               | git-flow-next                     | [ ] تأیید کنید که `FinishBranchUseCase` این کار را انجام می‌دهد؛ اگر نه، اضافه کنید (`-f, --force` برای رد شدن).                                                                                                                                                                                                                                       |
| اولویت پیکربندی لایه‌ای هر نوع شاخه: پیش‌فرض نوع شاخه → override ویژه دستور → flag CLI (همیشه برنده است) | git-flow-next                     | تا حدی دارد – تعریف workflow از قبل پیش‌فرض‌های هر نوع را می‌دهد (`merge.squash.branchTypes`، `versioning.bumpRules` و غیره) که flagهای CLI مانند `--squash` آنها را override می‌کنند. آنچه کم است یک لایه میانی ویژه دستور است (مثلاً "به‌طور پیش‌فرض squash کن، اما نه وقتی از CI فراخوانی می‌شود") – در صورت وجود تقاضا، به‌عنوان ایده P3 ثبت کنید. |
| قالب‌های پیام commit/merge ویژه هر نوع (`gitflow.<type>.finish.mergeMessage`، `...updateMessage`)        | git-flow-next                     | [ ] پیاده‌سازی نشده – به "گزینه‌های پیام غنی‌تر" در زیر نسخه‌گذاری و Changelog مراجعه کنید.                                                                                                                                                                                                                                                            |
| commitها/تگ‌های امضا شده، ویژه هر نوع (`gitflow.release.finish.sign`, `.signingkey`)                     | git-flow-next                     | [ ] پیاده‌سازی نشده – تحت "پشتیبانی کامل از commitها و تگ‌های امضا شده" در زیر پیگیری می‌شود.                                                                                                                                                                                                                                                          |
| رفتار شاخه support (شاخه‌ای که فقط به جلو ادغام می‌شود، هرگز به عقب)                                     | nvie/gitflow, AVH                 | تا حدی دارد – `support` در preset `classic` یک ورودی `branchTypes` معتبر است، اما رفتار متمایز آن (فقط ادغام به جلو، معمولاً از `main`/یک تگ، طولانی‌عمر) به‌طور خاص مدل‌سازی نشده است – امروز مانند هر نوع موضوع دیگری رفتار می‌کند.                                                                                                                  |
| دستور `integrate` برای شاخه‌های پایه (ادغام یک شاخه پایه در فرزند بدون حذف آن)                           | AVH (workflowهای release/support) | [ ] پیاده‌سازی نشده.                                                                                                                                                                                                                                                                                                                                   |
| عبور گزینه‌های push در `publish`/`track` (`-o <push-option>`، برای GitLab/Gerrit/Gitea)                  | AVH                               | [ ] پیاده‌سازی نشده.                                                                                                                                                                                                                                                                                                                                   |
| flagهای غنی‌تر finish به‌طور کلی (`--keep-remote`، `--force-delete`، `--tagname`، `--no-tag`)            | AVH, git-flow-next                | [ ] پیاده‌سازی نشده – جایگزین نکته قبلی با همین نام می‌شود.                                                                                                                                                                                                                                                                                            |
| پشتیبانی قوی‌تر از base سفارشی در `start`                                                                | AVH, git-flow-next                | تا حدی دارد – `gitwe start <type> <name> [base]` از قبل override را می‌پذیرد؛ آنچه کم است اعتبارسنجی `[base]` در برابر baseهای مجاز workflow به روش AVH/`git-flow-next` است.                                                                                                                                                                           |

---

### ۱۵. نسخه‌گذاری و Changelog

- [ ] فعال‌سازی و تکمیل پشتیبانی از changelog (هماهنگ با `cliff.toml`).

- [ ] بهبود مدیریت prerelease.

- [ ] `tagFormat` و گزینه‌های پیام غنی‌تر (به ردیف قالب‌های پیام ویژه هر نوع در جدول برابری بالا مراجعه کنید).

---

### ۱۶. سایر

- [ ] `--dry-run` غنی‌تر برای finish (لیست دقیق گام‌ها + ریموت‌هایی که تحت تأثیر قرار می‌گیرند).

- [ ] پشتیبانی کامل از commitها و تگ‌های امضا شده (به جدول برابری بالا مراجعه کنید).

---

## P3 – ۱.۳ به بعد (ادغام و آینده)

- [ ] GitHub Action رسمی و مستند با کش مناسب و مثال‌های ماتریسی (موضوع به موارد P0 `action.yaml` بستگی دارد).

- [ ] افزونه VS Code ابتدایی (start / finish / overview / doctor) – `git-flow-next` قبلاً یکی دارد (<https://github.com/gittower/git-flow-next-vs-code-extension>) که ارزش بررسی طراحی قبل از شروع از صفر را دارد.

- [ ] پشتیبانی از workflow در زیرمسیرها / مسیرها برای مونورپو.

- [ ] انتشار JSON Schema برای تعریف workflow در Schema Store.

- [ ] workflow قابل استفاده مجدد که مخازن دیگر بتوانند فراخوانی کنند.

- [ ] I/O ساخت‌یافته برای hookها (برای نسخه ۲.۰).

- [ ] اسکریپت‌های استراتژی سبک (برای نسخه ۲.۰).

---

## نکات برای مشارکت‌کنندگان

- Pull Requestها را متمرکز نگه دارید. موارد بزرگ باید به چندین issue تقسیم شوند.
- چک‌باکس این فایل را در همان PR که مورد را پیاده‌سازی می‌کند، علامت بزنید.
- چک‌لیست قالب PR را پر کنید (به‌ویژه مرزهای لایه‌ای و عدم وجود مفاهیم تکراری در domain).
- تغییرات بزرگ طراحی همچنان نیاز به RFC در `docs/development/rfcs/` دارند.
- قبل از علامت زدن یک مورد برابری به‌عنوان "دارد"، `src/cli/program.ts` را بررسی کنید – وجود یک فایل در `src/cli/commands/` به این معنی نیست که از باینری `gitwe` قابل دسترسی است. به `docs/commands.md` مراجعه کنید.
