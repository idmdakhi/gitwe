این دقیقاً مهم‌ترین قسمت معماری است.

وقتی می‌گویم **Language Agnostic (مستقل از زبان)** یعنی **قوانین و رفتار برنامه را از زبان برنامه‌نویسی جدا کنیم**.

یک مثال ساده:

---

## روش معمول (وابسته به زبان)

مثلاً در TypeScript بنویسی:

```ts
new FinishWorkflow([new PreflightStep(), new FetchStep(), new MergeStep(), new PushStep()]);
```

اگر بخواهی فردا Go بنویسی، باید دوباره همه چیز را بنویسی.

اگر Rust بنویسی، باز هم از اول.

---

## روش Language Agnostic

به جای اینکه Workflow داخل کد باشد، آن را به صورت **Specification** تعریف می‌کنی.

مثلاً:

```yaml
workflow: finish

steps:
  - id: preflight
  - id: fetch
  - id: merge
  - id: push
```

این فایل هیچ ربطی به TypeScript یا Rust یا Python ندارد.

فقط می‌گوید:

> Workflow به نام `finish` از چهار Step تشکیل شده است.

---

## Runtime فقط آن را اجرا می‌کند

مثلاً Runtime در Rust این فایل را می‌خواند.

```text
Workflow

↓

Step = preflight

↓

Plugin.execute()

↓

Step = fetch

↓

Plugin.execute()

↓

Step = merge
```

همین Runtime را می‌توانی در Go هم بنویسی.

بدون تغییر Specification.

---

## مثال دیگر

مثلاً یک Step:

```yaml
id: merge

plugin: git

action: merge

inputs:
  source: feature/login

  target: develop
```

Runtime فقط این را می‌بیند.

بعد Plugin Git تصمیم می‌گیرد:

در Rust:

```rust
git merge feature/login
```

در Python:

```python
repo.merge(...)
```

در Go:

```go
git.Merge(...)
```

Specification هیچ تغییری نمی‌کند.

---

# مزیت

فرض کن ۵ سال بعد بخواهی Engine را عوض کنی.

الان:

```text
Workflow

↓

TypeScript
```

بعداً:

```text
Workflow

↓

Rust
```

هیچ Workflowی تغییر نمی‌کند.

فقط Runtime عوض می‌شود.

---

# حتی بهتر

من Specification را فقط برای Workflow نمی‌نویسم.

بلکه برای کل سیستم.

مثلاً:

```text
Specification

├── workflow.yaml
├── plugins.yaml
├── permissions.yaml
├── variables.yaml
├── events.yaml
├── transitions.yaml
└── state.schema.json
```

تمام این فایل‌ها **قرارداد (Contract)** هستند، نه کد.

---

# شبیه چه پروژه‌هایی است؟

این ایده در پروژه‌های بزرگ هم استفاده می‌شود:

- **OpenAPI**: ابتدا API را به صورت YAML تعریف می‌کنی، بعد برای TypeScript، Go، Java، Python و ... کد تولید می‌شود.
- **Kubernetes**: شما YAML می‌نویسی، اما Kubernetes که با Go نوشته شده آن را اجرا می‌کند.
- **GitHub Actions**: Workflowها YAML هستند، ولی Runner با زبان دیگری پیاده‌سازی شده است.
- **Terraform**: فایل‌های HCL زبان مستقل از پیاده‌سازی هستند.

---

## پیشنهاد من برای GitWE

من اصلاً دوست ندارم Workflowها داخل کد نوشته شوند.

بلکه این‌گونه:

```text
gitwe/

spec/
│
├── finish.workflow.yaml
├── start.workflow.yaml
├── release.workflow.yaml
├── hotfix.workflow.yaml
└── publish.workflow.yaml

plugins/
│
├── git/
├── docker/
├── ssh/
└── kubernetes/

runtime/
```

در این معماری، **Workflowها داده (Data)** هستند و **Engine فقط اجراکننده (Executor)** است.

این بزرگ‌ترین تفاوت یک برنامهٔ معمولی با یک **پلتفرم** است؛ شما دیگر برای اضافه کردن یک Workflow جدید لازم نیست Engine را تغییر دهید، بلکه فقط یک فایل Specification جدید تعریف می‌کنید و در صورت نیاز Pluginهای مربوط به Stepها را اضافه می‌کنید.
