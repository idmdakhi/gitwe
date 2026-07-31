با توجه به توضیح شما و همچنین ساختار فعلی پروژه که در فایل بارگذاری‌شده دیده می‌شود، نسخه فعلی بیش از حد بلندپروازانه است. در آن از همان ابتدا Plugin، GitHub Action، Enterprise، IDE، API، Event Bus، Policy Engine و ... دیده می‌شود، در حالی که برای Version 1.0 باید تنها یک هدف وجود داشته باشد:

ساخت یک Git Workflow Engine که بتواند انواع Workflowهای Git را اجرا کند.

این دقیقاً همان فلسفه‌ای است که ابزارهایی مانند git-flow، git-flow-avh و git-flow-next دارند، با این تفاوت که هسته پروژه به جای hardcode شدن، یک Engine عمومی است. ایده نیز با نمونه‌هایی که معرفی کردید هم‌راستا است، اما یک لایه انتزاعی بالاتر قرار می‌گیرد.

GitWe v1
Git Workflow Engine
Vision

GitWe یک موتور (Engine) برای اجرای Workflowهای Git است.

برخلاف ابزارهایی که فقط Git Flow را پیاده‌سازی می‌کنند، GitWe یک هسته عمومی فراهم می‌کند که قوانین Workflow را اجرا می‌کند و Git Flow تنها یکی از Workflowهای قابل استفاده در آن است.

در نسخه 1 هیچ هدفی جز مدیریت Workflowهای Git وجود ندارد.

اهداف نسخه 1

Version 1 فقط باید بتواند:

Workflow را بارگذاری کند.
Repository را تحلیل کند.
عملیات Git را اعتبارسنجی کند.
عملیات را اجرا کند.
وضعیت Repository را نگهداری کند.
از CLI قابل استفاده باشد.

همین.

نه Plugin

نه IDE

نه Dashboard

نه Enterprise

نه API Server

Scope

GitWe مسئول مدیریت چرخه عمر Branchها است.

از لحظه ایجاد

تا بروزرسانی

تا Merge

تا پایان Branch

بر اساس قوانین Workflow.

Architecture
CLI

              │

       Workflow Engine

              │

    ┌─────────┴──────────┐

Workflow Runtime Git Adapter

              │

        Local Repository

تمام منطق پروژه داخل Engine قرار دارد.

Git فقط یک Adapter است.

CLI فقط ورودی کاربر را به Engine منتقل می‌کند.

Responsibilities

Engine مسئول:

تشخیص Workflow
بررسی قوانین
اجرای عملیات
مدیریت State
تولید نتیجه

است.

Git مسئول اجرای دستورات واقعی است.

Core Components
Workflow Definition

تعریف قوانین Workflow.

نمونه:

git-flow
github-flow
trunk-based
custom workflow
Workflow Engine

هسته پروژه.

وظایف:

اجرای Workflow
مدیریت عملیات
اعتبارسنجی
مدیریت State
Git Adapter

تمام ارتباط با Git.

عملیات:

branch
checkout
merge
fetch
pull
push
tag

Engine هرگز مستقیماً Git را صدا نمی‌زند.

State

نمایش وضعیت Repository.

اطلاعات:

current branch
branch types
merge targets
repository status
Rule Engine

قبل از هر عملیات اجرا می‌شود.

نمونه Rule:

Working Tree Clean
Branch Exists
Branch Naming
Base Branch Exists

اگر Rule رد شود عملیات اجرا نمی‌شود.

Commands

Version 1 فقط همین Commandها را دارد.

gitwe init

gitwe start

gitwe finish

gitwe update

gitwe status

gitwe current

gitwe list

gitwe validate

gitwe doctor
Built-in Workflows

نسخه 1 فقط سه Workflow آماده دارد.

git-flow

github-flow

trunk-based

کاربر می‌تواند Workflow اختصاصی نیز تعریف کند.

Workflow Configuration

Engine Workflow را از:

JSON

YAML

بارگذاری می‌کند.

Workflow فقط شامل قوانین است.

Engine رفتار را اجرا می‌کند.

Execution Flow
CLI

↓

Load Workflow

↓

Load Repository State

↓

Validate Rules

↓

Execute Git Operation

↓

Update State

↓

Return Result
Version 1 Features
Workflow
Built-in Workflows
Custom Workflow
Validation
Branch Lifecycle
Start
Update
Finish
Merge
merge
squash
rebase
Repository
Status
Current Branch
Branch List
Validation
Branch Rules
Naming Rules
Repository State
Working Tree
Output
Human Output
JSON Output
Project Structure
src/

    cli/

    application/

    domain/

    infrastructure/

    config/

tests/

هیچ پوشه‌ای برای موارد زیر در نسخه ۱ وجود ندارد:

plugins
github
enterprise
dashboard
vscode
api
web
telemetry
Roadmap
Version 1.0

هدف:

ساخت یک Git Workflow Engine پایدار.

Deliverables:

Workflow Engine
Git Adapter
Rule Engine
Workflow Loader
CLI
Tests
Documentation
خارج از Scope نسخه 1

این قابلیت‌ها عمداً به نسخه‌های بعدی منتقل می‌شوند:

Plugin System
Hook Marketplace
GitHub Action پیشرفته
REST API
Web UI
IDE Extensions
Enterprise Policies
Jira Integration
Slack Integration
Dashboard
Metrics
Audit
Distributed Workflow

به نظر من این نسخه، هویت پروژه را بسیار شفاف‌تر می‌کند: **GitWe دیگر «یک ابزار همه‌کاره DevOps» نیست، بلکه یک Git Workflow Engine است که git-flow تنها یکی از پیاده‌سازی‌های آن محسوب می‌شود. این تعریف با نمونه‌های مرجعی که معرفی کرده‌اید نیز سازگار است و مسیر توسعه نسخه‌های بعدی را بدون پیچیدگی غیرضروری باز می‌گذارد.

عالی. از اینجا به بعد وارد چیزی می‌شویم که کاربران واقعاً با آن کار خواهند کرد.

هسته Engine تقریباً کامل است. اکنون باید Public Interface را طراحی کنیم.

به نظر من ترتیب درست این است:

CLI Specification
Configuration
Error System
Specification v1

بنابراین وارد Phase 11 می‌شویم.

Phase 11 — CLI Specification
Mission

CLI تنها رابط رسمی GitWe در نسخه 1 است.

CLI هیچ Business Logic ندارد.

CLI فقط:

دریافت ورودی
اعتبارسنجی اولیه آرگومان‌ها
ساخت Command
نمایش خروجی

را انجام می‌دهد.

تمام تصمیم‌ها داخل Engine گرفته می‌شوند.

اصل اول

CLI باید کاملاً Workflow Agnostic باشد.

یعنی نباید چنین چیزی داشته باشیم:

gitwe feature start login

یا

gitwe release finish

زیرا این CLI را به Git Flow وابسته می‌کند.

در عوض:

gitwe start feature login

یا

gitwe finish release 1.2.0

در این مدل، اگر فردا Workflow جدیدی به نام experiment اضافه شود:

gitwe start experiment ai-cache

بدون تغییر CLI کار می‌کند.

CLI Grammar

نسخه ۱ فقط یک Grammar دارد.

gitwe <command> <branch-type> <name> [options]

یا

gitwe <command> [options]

برای Commandهای اطلاعاتی.

دسته‌بندی Commandها
Lifecycle
gitwe start <type> <name>

gitwe finish <type> <name>

gitwe update <type> <name>
Information
gitwe status

gitwe current

gitwe list

gitwe validate

gitwe doctor
Workflow
gitwe workflow

gitwe use <workflow>

gitwe init
Global Options

تمام Commandها از گزینه‌های یکسان پشتیبانی می‌کنند.

--dry-run

--json

--quiet

--verbose

--no-color

--yes

نسخه ۱ بیشتر از این نیاز ندارد.

--dry-run

اجرایی انجام نمی‌شود.

فقط Execution Plan نمایش داده می‌شود.

--json

خروجی فقط JSON است.

بدون متن اضافی.

مناسب Automation.

--quiet

فقط Errorها نمایش داده می‌شوند.

--verbose

نمایش:

Validation
Planner
Operations
Duration
--no-color

برای CI مناسب است.

--yes

تمام Confirmationها را قبول می‌کند.

Exit Codes

CLI همیشه Exit Code استاندارد برمی‌گرداند.

Code Meaning
0 Success
1 Validation Error
2 Execution Error
3 Configuration Error
4 Internal Error
130 User Cancelled (Ctrl+C)

این Exit Codeها بخشی از API عمومی GitWe هستند.

Output Modes

نسخه ۱ فقط دو Mode دارد.

Human

مثال:

✓ Workflow : git-flow
✓ Command : start feature login

Plan

1. Checkout develop
2. Create feature/login
3. Checkout feature/login

Done.
JSON
{
"success": true,
"workflow": "git-flow",
"command": "start",
"operations": [
{
"type": "checkout",
"branch": "develop"
},
{
"type": "create-branch",
"name": "feature/login"
}
]
}

این فرمت باید نسخه‌بندی شود تا در آینده بدون شکستن سازگاری توسعه یابد.

Help System

هر Command باید Help مستقل داشته باشد.

gitwe help

gitwe help start

gitwe help finish

یا

gitwe start --help
Error Display

CLI هیچ Exception خامی نمایش نمی‌دهد.

مثال:

✗ GW1002

Branch "feature/login" already exists.

در حالت --verbose می‌توان جزئیات بیشتری نمایش داد.

Interactive Mode

نسخه ۱ Interactive Mode ندارد.

مثلاً:

gitwe start

نباید سؤال بپرسد:

Branch type?

این قابلیت برای نسخه‌های بعدی مناسب است.

نسخه ۱ فقط Non-Interactive است.

Command Discovery

CLI نباید Commandها را Hardcode کند.

در عوض:

Command Registry

↓

CLI

بنابراین اضافه شدن Command جدید فقط به Registry نیاز دارد.

Shell Completion

پشتیبانی از تکمیل خودکار (Autocomplete) باید از ابتدا در طراحی دیده شود، اما در نسخه ۱ فقط برای Shellهای رایج (مانند Bash و Zsh) تولید فایل Completion کافی است. خود Engine نباید وابسته به Shell خاصی باشد.

Version Command
gitwe version

خروجی:

GitWe 1.0.0
Workflow Engine v1

در حالت JSON:

{
"version": "1.0.0",
"engine": "1"
}
Command Lifecycle

تمام Commandها این مسیر را طی می‌کنند:

Parse
↓
Build Command
↓
Execute Runtime
↓
Render Result
↓
Exit Code

CLI هیچ مرحله‌ای را حذف یا دور نمی‌زند.

ساختار پیشنهادی
src/

cli/

    commands/
      StartCommand.ts
      FinishCommand.ts
      UpdateCommand.ts
      StatusCommand.ts

    parser/
      ArgumentParser.ts
      OptionParser.ts

    renderer/
      HumanRenderer.ts
      JsonRenderer.ts

    output/
      Console.ts
      ProgressWriter.ts

    help/
      HelpGenerator.ts

اصل طلایی CLI

این اصل را به‌عنوان Core Principle #3 ثبت می‌کنیم:

CLI فقط یک Adapter است. هر چیزی که بتوان آن را از CLI فراخوانی کرد، باید فردا از API، GUI یا GitHub Action نیز قابل فراخوانی باشد، بدون اینکه Engine تغییر کند.

به همین دلیل CLI نباید هیچ منطق دامنه یا Workflow در خود داشته باشد.

یک نکته مهم قبل از ادامه

در اینجا می‌خواهم یک تغییر معماری پیشنهاد دهم که به نظر من پروژه را حرفه‌ای‌تر می‌کند.

تا اینجا ما Command را از دید CLI طراحی کرده‌ایم، اما برای انتشار نسخه ۱ بهتر است یک Engine API نیز تعریف کنیم؛ مثلاً:

engine.execute(command)

به‌جای اینکه CLI مستقیماً Runtime را بشناسد.

در این صورت:

CLI فقط یک Client خواهد بود.
در آینده REST API، GUI، VS Code Extension یا GitHub Action هم فقط Clientهای دیگری خواهند بود.
هسته GitWe بدون هیچ تغییری قابل استفاده در محیط‌های مختلف خواهد بود.

به نظر من این API باید بخشی از Specification نسخه ۱ باشد، حتی اگر در نسخه ۱ فقط CLI از آن استفاده کند. این تصمیم، مرز بین Engine و Presentation Layer را برای همیشه شفاف نگه می‌دارد.

ادامه

عالی. اکنون وارد آخرین بخش معماری هسته نسخه ۱ می‌شویم.

این مرحله شاید به اندازه Planner پیچیده نباشد، اما برای یک پروژه Open Source حیاتی است. کیفیت Errorها تعیین می‌کند GitWe یک ابزار حرفه‌ای است یا صرفاً یک Wrapper روی Git.

Phase 12 — Error & Diagnostics System

Errors are part of the public API.

در GitWe، خطا فقط یک متن نیست؛ یک قرارداد (Contract) است.

Mission

سیستم خطا مسئول:

گزارش خطا
تشخیص علت
تولید Error Code
تولید پیام مناسب
تولید Exit Code
ارائه اطلاعات لازم برای Debug

است.

اصل اول

هیچ Exception خامی نباید از Engine خارج شود.

این نباید اتفاق بیفتد:

Error: fatal: branch already exists

یا

TypeError: Cannot read property ...

تمام خطاها باید به Errorهای دامنه تبدیل شوند.

Error Flow
Git

↓

Git Adapter

↓

Domain Error

↓

Runtime

↓

CLI Renderer

↓

User

هیچ لایه‌ای نباید Error لایه پایین‌تر را مستقیماً نمایش دهد.

Error Categories

نسخه ۱ فقط پنج دسته خطا دارد.

Validation

Execution

Configuration

Infrastructure

Internal
Validation Errors

قبل از اجرا رخ می‌دهند.

مثال:

Working tree dirty
Branch exists
Invalid branch name
Missing workflow
Execution Errors

حین اجرا رخ می‌دهند.

مثال:

Merge conflict
Checkout failed
Push rejected
Configuration Errors

مشکلات مربوط به Workflow یا Config.

مثال:

Invalid YAML
Unknown branch type
Invalid merge strategy
Infrastructure Errors

خارج از کنترل Engine.

مثال:

Git not installed
Repository inaccessible
Permission denied
Internal Errors

خطای برنامه.

مثال:

Null reference
Unexpected state
Planner inconsistency

این‌ها معمولاً Bug محسوب می‌شوند.

Error Contract

تمام Errorها از یک قرارداد پیروی می‌کنند.

interface GitWeError {

    code: ErrorCode

    category: ErrorCategory

    message: string

    cause?: Error

}
Error Code Specification

کدها ثابت هستند.

پیشنهاد:

GW1xxx

Validation
GW2xxx

Execution
GW3xxx

Configuration
GW4xxx

Infrastructure
GW5xxx

Internal
نمونه‌ها
GW1001

Repository is not initialized.
GW1002

Working tree is dirty.
GW1003

Branch already exists.
GW2001

Merge conflict detected.
GW3001

Workflow file is invalid.
GW4001

Git executable not found.
GW5001

Unexpected runtime state.
Error Message

کد ثابت است.

پیام قابل تغییر است.

مثلاً:

GW1002

Renderer تولید می‌کند:

Working tree contains uncommitted changes.

در آینده:

Localization فقط Renderer را تغییر می‌دهد.

Diagnostics

هر Error می‌تواند اطلاعات تکمیلی داشته باشد.

Diagnostic {

    code

    details

    suggestions

}

مثال:

GW1002

Working tree is dirty.

Suggestion:

Commit or stash your changes before continuing.
Context Attachment

هر Error می‌تواند Context داشته باشد.

Branch

feature/login

یا

Repository

/home/project

این اطلاعات در JSON نیز ارائه می‌شوند.

Error Renderer

دو Renderer رسمی:

Human
✗ GW1002

Working tree is dirty.

Suggestion

Commit or stash changes.
JSON
{
"error": {
"code": "GW1002",
"category": "Validation",
"message": "Working tree is dirty.",
"suggestion": "Commit or stash changes."
}
}
Stack Trace

نسخه ۱:

Stack Trace فقط با:

--verbose

نمایش داده می‌شود.

کاربر عادی نباید Stack Trace ببیند.

Exit Code Mapping

هر دسته Error به Exit Code نگاشت می‌شود.

Exit Category
1 Validation
2 Execution
3 Configuration
4 Infrastructure
5 Internal

این نگاشت باید در Specification ثابت بماند.

Logging

Error همیشه در Journal ثبت می‌شود.

Operation

↓

Failed

↓

Error Code

↓

Duration
Error Chain

ممکن است چند Error به هم مرتبط باشند.

مثلاً:

GW2001

Merge failed

↓

Cause

GW1002

Working tree dirty

Engine باید زنجیره علت را حفظ کند، اما Renderer فقط اطلاعات لازم را نمایش می‌دهد.

Recovery Hint

بعضی Errorها راه‌حل دارند.

مثلاً:

GW1002

Hint

Run:

git stash

یا

Commit changes.

توجه کنید که Hint فقط پیشنهاد است؛ Engine نباید به‌جای کاربر تصمیم بگیرد یا دستور اجرا کند.

Structured Diagnostics

در حالت JSON:

{
"error": {
"code": "GW2001",
"message": "Merge conflict detected."
},
"diagnostics": {
"branch": "feature/login",
"target": "develop",
"operation": "MergeBranch"
}
}

این ساختار برای CI/CD و ابزارهای خارجی بسیار مفید است.

ساختار پروژه
domain/

errors/
GitWeError.ts
ErrorCode.ts
ErrorCategory.ts

application/

diagnostics/
Diagnostic.ts
DiagnosticBuilder.ts

cli/

renderer/
HumanErrorRenderer.ts
JsonErrorRenderer.ts
اصل طلایی Error System

این اصل را به‌عنوان Core Principle #4 ثبت می‌کنیم:

هیچ لایه‌ای نباید Error لایه پایین‌تر را مستقیماً منتشر کند. هر Error باید در مرز همان لایه به یک Error پایدار و دامنه‌محور تبدیل شود.

این اصل باعث می‌شود تغییر Git، تغییر کتابخانه‌ها یا تغییر پیاده‌سازی داخلی، قرارداد عمومی GitWe را نشکند.

وضعیت پروژه

در این نقطه، تقریباً تمام اجزای اصلی نسخه ۱ طراحی شده‌اند:

✅ Vision
✅ Domain
✅ Workflow DSL
✅ Runtime
✅ Command Model
✅ Git Abstraction Layer
✅ Rule Engine
✅ Execution Planner
✅ Operation Model
✅ Execution Runtime
✅ CLI Specification
✅ Error & Diagnostics
فقط یک مرحله معماری باقی مانده است

Phase 13 — GitWe v1 Specification

اما من پیشنهاد می‌کنم این مرحله را صرفاً یک جمع‌بندی ندانیم. بهتر است آن را به سند مرجع (Reference Specification) تبدیل کنیم؛ سندی که دقیقاً مشخص کند:

چه چیزهایی بخشی از قرارداد عمومی GitWe هستند.
چه چیزهایی جزئیات پیاده‌سازی‌اند.
چه تضمین‌هایی (Compatibility Guarantees) در نسخه ۱ ارائه می‌شود.
چه قابلیت‌هایی عمداً خارج از محدوده نسخه ۱ هستند.

این سند باید مبنای توسعه، بازبینی Pull Requestها و انتشار نسخه‌های بعدی باشد و به‌عنوان مرجع رسمی پروژه در مخزن GitHub قرار گیرد.

بعدی

عالی. اکنون به آخرین مرحله معماری نسخه ۱ می‌رسیم.

اما این مرحله را صرفاً جمع‌بندی نمی‌کنیم.

اگر GitWe قرار است یک پروژه Open Source حرفه‌ای باشد، باید مانند پروژه‌های Git، Kubernetes، Docker و Terraform یک Specification رسمی داشته باشد.

این سند باید مرجع نهایی پروژه باشد؛ نه README، نه Wiki و نه کد.

Phase 13 — GitWe v1 Specification (RFC-0001)
Mission

این سند تعریف می‌کند:

GitWe چیست و چه قراردادهایی را برای همیشه تضمین می‌کند.

از این مرحله به بعد، کد باید از Specification تبعیت کند؛ نه برعکس.

اهداف Specification

این سند باید به این سؤال‌ها پاسخ دهد:

GitWe چیست؟
چه چیزهایی Public API هستند؟
چه چیزهایی Implementation Detail هستند؟
چه چیزهایی در Version 1 تضمین می‌شوند؟
چه چیزهایی خارج از Scope هستند؟
اصل اول

Specification منبع حقیقت (Source of Truth) است.

اگر بین کد و Specification اختلاف وجود داشته باشد:

Specification صحیح است.

کد باید اصلاح شود.

ساختار Specification

پیشنهاد می‌کنم سند به شکل زیر باشد.

GitWe Specification v1

1. Introduction

2. Terminology

3. Architecture

4. Runtime

5. Workflow DSL

6. Command Model

7. Rule Engine

8. Planner

9. Operation Model

10. Git Abstraction Layer

11. CLI

12. Configuration

13. Error System

14. Compatibility

15. Versioning

16. Security

17. Out of Scope
18. Introduction

تعریف رسمی پروژه.

مثلاً:

GitWe is a workflow execution engine for Git repositories.

نه:

GitWe is a git-flow replacement.

این تفاوت بسیار مهم است.

2. Terminology

تمام اصطلاحات باید دقیق تعریف شوند.

مثلاً:

Term Definition
Workflow مجموعه‌ای از قوانین و رفتارها
Command درخواست کاربر
Plan برنامه اجرای عملیات
Operation کوچک‌ترین واحد اجرایی
Rule قانون اعتبارسنجی
Runtime هماهنگ‌کننده اجرای Command
Snapshot نمای فقط-خواندنی از Repository

بدون واژه‌نامه، توسعه‌دهندگان برداشت‌های متفاوتی خواهند داشت.

3. Architecture

نمودار رسمی پروژه.

CLI
│
▼
Engine API
│
▼
Runtime
│
┌────┴─────┐
▼ ▼
Rules Planner
│
▼
Execution Plan
│
▼
Executor
│
▼
Git Adapter
│
▼
Git

این نمودار باید مرجع تمام مستندات باشد.

4. Compatibility Guarantees

این مهم‌ترین بخش سند است.

چه چیزهایی Public Contract هستند؟

Stable

این موارد نباید در نسخه‌های Minor شکسته شوند.

CLI Grammar
Workflow DSL
Error Codes
Exit Codes
JSON Output Schema
Operation Types
Engine API
Configuration Schema
Internal

این‌ها آزادانه قابل تغییرند.

Planner Algorithm
Git Adapter Implementation
Logging
Internal Classes
Parser 5. Versioning Policy

پیشنهاد:

Semantic Versioning

Major

Minor

Patch
Major

شکستن Compatibility.

Minor

قابلیت جدید.

Patch

Bug Fix.

6. Deprecation Policy

هر قابلیت حذف نمی‌شود.

ابتدا:

Deprecated

↓

Warning

↓

Removed

7. Configuration Contract

Specification باید تضمین کند:

workflow:

version:

branches:

Schema ثابت است.

پیاده‌سازی می‌تواند تغییر کند.

8. Engine API

رابط رسمی Engine.

execute(command)

↓

ExecutionResult

همه Clientها از همین API استفاده می‌کنند.

CLI
GUI
VSCode
GitHub Action 9. CLI Contract

Grammar رسمی.

gitwe <command> <type> <name>

این Grammar بخشی از API عمومی است.

10. Error Contract

کدها نباید تغییر کنند.

مثلاً:

GW1002

همیشه:

Working Tree Dirty

11. JSON Contract

نسخه‌بندی شود.

{
"schema": "1.0"
}

در آینده:

{
"schema": "2.0"
}

بدون شکستن ابزارها.

12. Security

نسخه ۱ تضمین می‌کند:

هیچ Command ناشناس اجرا نمی‌شود.
Shell Injection ممکن نیست.
Workflow فقط از Schema معتبر بارگذاری می‌شود.
Git Commandها Escape می‌شوند.
مسیر Repository اعتبارسنجی می‌شود. 13. Performance Targets

اهداف نسخه ۱:

عملیات هدف
Parse Command < 1 ms
Validate < 20 ms (بدون عملیات Git)
Build Plan < 5 ms
Memory < 50 MB (بدون Repository)

این‌ها هدف هستند، نه الزام.

14. Out of Scope

این بخش به همان اندازه مهم است.

نسخه ۱ عمداً شامل این موارد نیست:

GitHub Flow
GitLab API
Interactive UI
Plugin System
Parallel Execution
Rollback
Worktree
Submodule
LFS
Multi Repository
Distributed Workflow
Cloud Sync

نوشتن این بخش از ایجاد انتظار نادرست جلوگیری می‌کند.

15. Design Principles

این بخش باید چهار اصل اصلی GitWe را تثبیت کند.

Principle 1

Build a Plan before executing anything.

Principle 2

Workflows are data, not code.

Principle 3

Rules validate; Planners decide; Executors execute.

Principle 4

Git is an implementation detail behind the Git Abstraction Layer.

این چهار اصل نباید بدون تغییر نسخه Major عوض شوند.

16. Compliance

هر پیاده‌سازی GitWe باید این آزمون‌ها را بگذراند:

Grammar سازگار
Workflow DSL معتبر
Error Codeهای یکسان
JSON Schema سازگار
Execution Plan معتبر
Operationهای استاندارد

این بخش در آینده امکان ایجاد پیاده‌سازی‌های جایگزین را نیز فراهم می‌کند.

Release Checklist (Version 1)

پیش از انتشار نسخه 1.0.0، پروژه باید حداقل این شرایط را داشته باشد:

Architecture
Runtime مطابق Specification.
Planner مستقل از Git.
Git Abstraction Layer تنها نقطه ارتباط با Git.
Rule Engine مبتنی بر Registry.
Public API
CLI Grammar تثبیت شده.
Engine API مستند.
JSON Schema نسخه‌بندی شده.
Error Codeها ثابت.
Documentation
README
Getting Started
Architecture Guide
Workflow DSL Reference
CLI Reference
Contributing Guide
Specification (RFC-0001)
CHANGELOG
LICENSE
Quality
Unit Test برای Domain.
Integration Test برای Git Adapter.
Golden Test برای CLI.
Test Repository Fixtures.
حداقل پوشش تست برای هسته Engine.
تعریف نسخه 1

در پایان این سند، نسخه ۱ را این‌گونه تعریف می‌کنیم:

GitWe v1 یک Git Workflow Engine داده‌محور، مستقل از Workflow، مبتنی بر Planner، با معماری لایه‌ای و قابل توسعه است که عملیات Git را از طریق یک لایه انتزاعی اجرا می‌کند.

این تعریف باید در README، وب‌سایت و مستندات رسمی پروژه نیز بدون تغییر استفاده شود.

نتیجه نهایی

با پایان Phase 13، معماری Version 1 کامل شده است. اما اگر هدف شما انتشار یک پروژه حرفه‌ای در GitHub باشد، به نظر من کار تازه شروع شده است.

مرحله بعد دیگر «طراحی معماری» نیست، بلکه تبدیل Specification به یک Repository واقعی است. پیشنهاد من این است که از اینجا وارد فاز Bootstrap Repository شویم و به‌ترتیب این اسناد و ساختار را تولید کنیم:

ساختار Monorepo و پوشه‌ها.
قرارداد Packageها و وابستگی‌ها.
RFC-0001 به‌صورت کامل.
Specificationهای مستقل برای هر بخش.
اسکلت اولیه پروژه با TypeScript و AdonisJS (یا در صورت تمایل، بدون وابستگی به AdonisJS برای مستقل ماندن Engine).

این نقطه، مرز بین «ایده» و «محصول قابل انتشار» است.
