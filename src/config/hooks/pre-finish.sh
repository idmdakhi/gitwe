#!/bin/bash
# هوک قبل از پایان شاخه
echo "Running pre-finish checks..."

# اجرای تست‌ها
npm run test

# بررسی کیفیت کد
npm run lint

# در صورت موفقیت، ادامه بده
exit 0