# Роли SAT Hub

## Порядок запуска SQL

В существующем проекте с таблицей `profiles`:

1. Если ещё не применяли предыдущую правку AI Tutor, выполните
   `supabase/migrations/add_ai_tutor_usage.sql`. Она независима от ролей.
2. Выполните `supabase/migrations/add_roles.sql`.
3. Назначьте первого администратора вручную в Supabase SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
```

Ожидается одна обновлённая строка. Аккаунт должен уже иметь профиль: сначала войдите
на сайт, чтобы профиль создался обычным способом. Не копируйте роль из пользовательских
метаданных. После назначения обновите страницу: в меню появится «Кабинет учителя».
В кабинете администратора пункт «Пользователи» ведёт на `/admin/users`.

Миграции в рабочую базу автоматически не применялись. Таблицы результатов и вопросы
не изменяются. Повторное выполнение `add_roles.sql` сохраняет назначенные роли.

## Проверка запрета самостоятельного повышения роли

Замените email ниже на email существующего **ученика** и выполните блок целиком в
SQL Editor. Он временно переключает SQL-роль на `authenticated`, моделируя REST-запрос
ученика. Ожидаются уведомления `OK`, профиль останется `student`. `rollback` отменяет
все пробные операции.

```sql
begin;
select set_config('request.jwt.claim.sub',
  (select id::text from auth.users where email = 'STUDENT_EMAIL'), true);
set local role authenticated;

select auth.uid(), public.current_user_role(), public.is_staff();
-- Ожидается: UUID ученика, student, false.

do $$
begin
  if auth.uid() is null or public.current_user_role() <> 'student' then
    raise exception 'Укажите email существующего ученика';
  end if;
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'ОШИБКА: самостоятельная смена роли разрешена';
  exception when insufficient_privilege then
    raise notice 'OK: UPDATE роли запрещён';
  end;
  begin
    insert into public.profiles(id, role) values(auth.uid(), 'teacher')
    on conflict(id) do update set role = excluded.role;
    raise exception 'ОШИБКА: UPSERT привилегированной роли разрешён';
  exception when insufficient_privilege then
    raise notice 'OK: INSERT/UPSERT роли запрещён';
  end;
end $$;

select role from public.profiles where id = auth.uid();
-- student
rollback;
```

Дополнительные проверки:

```sql
select tgname, tgenabled from pg_trigger
where tgrelid = 'public.profiles'::regclass and tgname = 'guard_profile_role';
-- guard_profile_role, O

select
  has_function_privilege('authenticated', 'public.admin_set_user_role(uuid,uuid,public.user_role)', 'EXECUTE') as student_can_set_role,
  has_function_privilege('anon', 'public.admin_list_users(text,integer)', 'EXECUTE') as guest_can_list_users,
  has_function_privilege('service_role', 'public.admin_set_user_role(uuid,uuid,public.user_role)', 'EXECUTE') as server_can_set_role;
-- false, false, true
```

Защита использует триггер, а не только column-level REVOKE: старое табличное право
UPDATE иначе перекрывало бы отзыв права на колонку. Даже администратор из браузера
не может напрямую изменить `profiles.role`. Доверенные `postgres`, `supabase_admin`
и `service_role` могут менять её; первые два нужны для SQL Editor и обслуживания.
Обычные обновления имени и других полей собственного профиля сохраняются.

`current_user_role()` и `is_staff()` — STABLE SECURITY DEFINER-функции с
`search_path = public`, без параметра чужого user ID. Роли берутся из базы.
Прежние RLS-политики учеников не расширяются для учителей.

## Серверная сессия и доступ

Существующий браузерный Supabase-клиент продолжает хранить/обновлять свою сессию.
Проверенный access token зеркалируется в HttpOnly/SameSite cookie через
`/api/auth/session`. Refresh token на сервер не передаётся. Обновление токена и
выход синхронизируют cookie. Переключатель кабинета ждёт этой синхронизации перед
переходом. Если вкладка была закрыта до истечения токена, прямой вход в кабинет
может перенаправить на главную: браузер обновит сессию, затем переключатель снова
откроет кабинет. Cookie сама по себе не даёт прав: сервер проверяет токен через
Supabase и заново читает роль из `profiles`.

Proxy защищает все `/teacher/*`, `/admin/*`, `/api/teacher/*`, `/api/admin/*`.
Layout и admin API дополнительно проверяют права. API используют только bearer
token, поэтому cookie не позволяет выполнить изменение роли через CSRF.
Отказ страниц — переход на `/`, отказ API — 403. Неавторизованные, анонимные
Supabase-пользователи и ошибки проверки закрывают доступ. Нет миграции — нет
доступа в новые кабинеты; функции ученика остаются доступными.

Учительские страницы пока содержат только честные заглушки «Скоро».
В `/admin/users` есть поиск по имени/email, серверная пагинация по 50 записей и
явная кнопка сохранения роли. SQL-функция проверяет роль администратора ещё раз
внутри транзакции и запрещает самостоятельное понижение роли.

## Проверки и откат

`npm run test:unit` включает матрицу доступа и серверные тесты с подменой Supabase.
`scripts/roles-sql.test.mjs` выполняет настоящую миграцию в локальном PGlite
(`PGLITE_PATH` — путь к внешней установке), включая повторный запуск, RLS и
попытки UPDATE/INSERT/UPSERT под ролью authenticated. Эти проверки не меняют
производственную базу и не заменяют проверку входа реальными staff-аккаунтами.

Для отката UI верните предыдущую версию приложения, оставив enum, колонку и
защитный триггер. Удалять данные и назначенные роли не требуется. При необходимости
доверенный администратор SQL Editor может вернуть конкретному аккаунту student.
Не отключайте RLS или триггер для устранения ошибок доступа.

## Изменённые и добавленные файлы

- `C:/Users/zumad/sat/supabase/migrations/add_roles.sql`
- `C:/Users/zumad/sat/proxy.ts`
- `C:/Users/zumad/sat/lib/roles.ts`
- `C:/Users/zumad/sat/lib/server/roles.ts`
- `C:/Users/zumad/sat/lib/supabase/serverSession.ts`
- `C:/Users/zumad/sat/lib/supabase/client.ts`
- `C:/Users/zumad/sat/app/api/auth/session/route.ts`
- `C:/Users/zumad/sat/app/api/admin/users/route.ts`
- `C:/Users/zumad/sat/app/teacher/layout.tsx`
- `C:/Users/zumad/sat/app/teacher/page.tsx`
- `C:/Users/zumad/sat/app/teacher/[section]/page.tsx`
- `C:/Users/zumad/sat/app/admin/layout.tsx`
- `C:/Users/zumad/sat/app/admin/page.tsx`
- `C:/Users/zumad/sat/app/admin/users/page.tsx`
- `C:/Users/zumad/sat/components/staff/TeacherShell.tsx`
- `C:/Users/zumad/sat/components/staff/RoleSwitch.tsx`
- `C:/Users/zumad/sat/components/staff/AdminUsers.tsx`
- `C:/Users/zumad/sat/components/dashboard/StudentAccount.tsx`
- `C:/Users/zumad/sat/types/database.ts`
- `C:/Users/zumad/sat/package.json`
- `C:/Users/zumad/sat/scripts/roles.test.ts`
- `C:/Users/zumad/sat/scripts/role-server.test.mjs`
- `C:/Users/zumad/sat/scripts/roles-sql.test.mjs`
- `C:/Users/zumad/sat/docs/roles.md`
