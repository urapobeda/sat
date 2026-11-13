# Группы SAT Hub

## Что запустить в Supabase

Роли уже должны быть настроены через `supabase/migrations/add_roles.sql`.
В существующем проекте достаточно выполнить в SQL Editor **один файл**:

`C:/Users/zumad/sat/supabase/migrations/add_groups.sql`

Затем обновите сайт. Миграция рабочей базы автоматически не применялась.
Повторный запуск сохраняет группы и участников. Вопросы, результаты, роли и
старые политики профилей не изменяются. Откат интерфейса не требует удаления
новых таблиц: оставьте данные на месте и верните предыдущую версию приложения.

## Возможности

- `/teacher/groups`: список, количество участников, коды, создание, фильтр архива.
- `/teacher/groups/[groupId]`: переименование, архив/возврат, участники, удаление
  участника, копирование кода и ссылки, генерация нового кода.
- Admin видит все группы и может назначить учителем teacher/admin. Прочие
  сотрудники управляют только собственными группами.
- `/join/[code]`: автоматическое вступление после входа. При переходе на вход,
  регистрации, подтверждении email и OAuth код сохраняется в ограниченном
  параметре `next`. Произвольные URL для редиректа запрещены.
- Меню ученика содержит «Вступить в группу» с вводом кода.
- Главная ученика показывает название и учителя каждой его группы. Сбой этой
  необязательной загрузки не скрывает остальную главную; есть «Повторить».

Код состоит из 8 символов без `0`, `O`, `1`, `I`, `L`. Регистр и крайние пробелы
при вводе нормализуются. Новый код отключает старую ссылку, сохраняя участников.
Архивирование сохраняет все связи и закрывает вступление. Повторное вступление
по действующему коду не дублирует участника и не меняет дату его вступления.
Удаление из группы удаляет только связь; аккаунт и результаты остаются на месте.

## Доступ и приватность

Запросы групп выполняются с настоящим JWT пользователя и RLS, а не через обход
проверок ключом service_role. Токен проверяется на сервере. Учительские API
дополнительно защищены proxy и проверкой staff. Смена учителя разрешена только admin.

У authenticated нет INSERT/UPDATE на group_members. Дополнительная restrictive
INSERT-политика запрещает прямое вступление даже при случайной выдаче INSERT
позже. `join_group_by_code(code)` — SECURITY DEFINER с `search_path = public`:
проверяет текущую роль student, действующую группу, блокирует строку группы и
вставляет только `auth.uid()` с `ON CONFLICT DO NOTHING`. Гость не может вызвать
функцию; анонимный Supabase-аккаунт тоже не может вступить.

RLS не расширяет доступ к profiles или таблицам результатов. Ограниченные
SECURITY DEFINER-функции возвращают отдельно:

- `list_my_groups`: только доступные группы и имя учителя;
- `get_group_members`: ID, имя, аватар и дату вступления участников только
  управляемой группы; email, ответы, оценки и другие поля не возвращаются;
- `list_group_teachers`: список имён сотрудников только для admin.

Аватары берутся из существующих метаданных аккаунта. В интерфейсе разрешены
только HTTPS-изображения; при отсутствии аватара показывается инициал.
Профили других людей напрямую по-прежнему не доступны. service_role получил
явные SELECT/INSERT/UPDATE/DELETE на обе новые таблицы; SELECT на profiles для
функциональности групп не требуется.

## Проверочные SQL-запросы

```sql
select relname, relrowsecurity from pg_class
where oid in ('public.groups'::regclass, 'public.group_members'::regclass);
-- Оба relrowsecurity = true.

select
  has_table_privilege('authenticated', 'public.group_members', 'INSERT') as direct_join,
  has_table_privilege('service_role', 'public.groups', 'SELECT') as server_groups,
  has_table_privilege('service_role', 'public.group_members', 'SELECT') as server_members;
-- false, true, true

select policyname, cmd, permissive from pg_policies
where schemaname = 'public' and tablename in ('groups', 'group_members');
```

Проверка ученика без изменения данных. Подставьте email **существующего ученика**:

```sql
begin;
select set_config('request.jwt.claim.sub',
  (select id::text from auth.users where email = 'STUDENT_EMAIL'), true);
set local role authenticated;
select auth.uid(), public.current_user_role();
select id, name, teacher_id from public.groups;
-- Только группы, где состоит этот ученик.
select * from public.list_my_groups();
-- Только его группы и имена их учителей.
do $$ begin
  if auth.uid() is null or public.current_user_role() <> 'student' then
    raise exception 'Укажите email существующего ученика';
  end if;
  begin
    insert into public.group_members(group_id, student_id)
    values('00000000-0000-4000-8000-000000000001', auth.uid());
    raise exception 'ОШИБКА: прямой INSERT разрешён';
  exception when insufficient_privilege then
    raise notice 'OK: вступление без функции и кода запрещено';
  end;
end $$;
rollback;
```

Для проверки учителя аналогично задайте его UUID через set_config, переключитесь
на authenticated и выполните SELECT из groups и list_my_groups: чужих групп
быть не должно. Проверять нужно с `SET LOCAL ROLE authenticated`: SQL Editor под
postgres намеренно обходит RLS.

## Проверки разработки

- `npm run build`, `npm run lint`, `npm run test:unit`.
- `npm run test:groups:sql` — настоящая миграция в локальном PGlite. Укажите
  `PGLITE_PATH` на внешнюю установку `@electric-sql/pglite/dist/index.js`, либо
  установите PGlite в своём тестовом окружении. Рабочая Supabase не используется.

SQL-тест проверяет изоляцию двух учителей и двух учеников, отсутствие доступа к
результатам, запрет прямого INSERT (включая случайно выданное право), повторное
вступление, неверный/старый/архивный код, участников, передачу группы, service_role
GRANT и повторное применение миграции без потери данных.

Браузерные проверки выполнены с явно помеченными QA-данными и подменой ответов API,
без создания групп в рабочей базе: создание, переименование, смена кода, архив,
возврат, удаление участника, меню ученика, переход на вход с сохранением кода,
возврат к приглашению после входа, успешная загрузка/повторная загрузка «Моей группы».
Полный прогон на реальной рабочей Supabase нужно выполнить после ручного применения
миграции. OAuth-переход во внешний Google в этой проверке не выполнялся.

## Изменённые и добавленные файлы

- `C:/Users/zumad/sat/app/api/teacher/groups/[groupId]/route.ts`
- `C:/Users/zumad/sat/app/api/teacher/groups/route.ts`
- `C:/Users/zumad/sat/app/api/teacher/groups/teachers/route.ts`
- `C:/Users/zumad/sat/app/join/[code]/page.tsx`
- `C:/Users/zumad/sat/app/teacher/groups/[groupId]/page.tsx`
- `C:/Users/zumad/sat/app/teacher/groups/page.tsx`
- `C:/Users/zumad/sat/components/auth/AuthPage.tsx`
- `C:/Users/zumad/sat/components/dashboard/DashboardPage.tsx`
- `C:/Users/zumad/sat/components/dashboard/StudentAccount.tsx`
- `C:/Users/zumad/sat/components/groups/GroupDetail.tsx`
- `C:/Users/zumad/sat/components/groups/GroupJoinMenuItem.tsx`
- `C:/Users/zumad/sat/components/groups/GroupsPage.tsx`
- `C:/Users/zumad/sat/components/groups/JoinGroupPage.tsx`
- `C:/Users/zumad/sat/components/groups/MyGroups.tsx`
- `C:/Users/zumad/sat/docs/groups.md`
- `C:/Users/zumad/sat/lib/groupApi.ts`
- `C:/Users/zumad/sat/lib/groups.ts`
- `C:/Users/zumad/sat/lib/server/groupAccess.ts`
- `C:/Users/zumad/sat/package.json`
- `C:/Users/zumad/sat/scripts/groups-api.test.mjs`
- `C:/Users/zumad/sat/scripts/groups-sql.test.mjs`
- `C:/Users/zumad/sat/scripts/groups.test.ts`
- `C:/Users/zumad/sat/supabase/migrations/add_groups.sql`
- `C:/Users/zumad/sat/types/database.ts`
