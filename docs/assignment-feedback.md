# Разбор домашних заданий

## SQL для запуска

Для существующего проекта с ролями, группами и assignments выполните в Supabase
SQL Editor **один новый файл**, целиком:

`C:/Users/zumad/sat/supabase/migrations/add_assignment_feedback.sql`

Рекомендуемый порядок для свежей базы: текущая базовая схема и существующие миграции
вопросов/вариантов → `add_roles.sql` → `add_groups.sql` → `add_assignments.sql` →
`add_assignment_feedback.sql`. Если заново запускаете add_assignments.sql, после
него повторите add_assignment_feedback.sql: она расширяет лимит попыток и права
чтения результатов.

В рабочую Supabase миграция автоматически не применялась. Она идемпотентна и не
удаляет ответы, сдачи, группы или аккаунты. В старом add_roles.sql исправлена
найденная опечатка `;git` после команды SQL; для уже настроенных ролей повторный
запуск этой старой миграции не нужен.

## Учитель

- `/teacher/homework/[assignmentId]` открывается со сводкой и результатами.
  Прежние настройки и выбор вопросов сохранены под отдельной кнопкой.
- Таблица включает участников группы и исторические сдачи выбывших учеников.
  Выбывшие помечены отдельно; их результаты не теряются.
- Статусы: «Не начал», «В процессе», «Сдано», «Сдано с опозданием». Ровно в срок
  считается вовремя, позднее срока — опоздание. Сроки отображаются как раньше,
  в Asia/Almaty.
- Учитывается одна последняя попытка на ученика. Начатая пересдача отображается
  «В процессе» и до её сдачи не входит в средний результат/анализ вопросов.
  Предыдущие попытки доступны на странице конкретной работы.
- Средний результат — средний процент последних завершённых попыток. Пока сдач
  нет, показывается «—». Никаких фиктивных результатов не добавляется.
- Анализ вопросов использует только эти сдачи. Пропуск — ошибка, но не включается
  в частый неверный ответ; количество пропусков показывается отдельно. Порог
  выделения строго больше 50%, а не 50% и выше.
- CSV выгружает видимые после фильтрации/сортировки строки. UTF-8 BOM, экранирование
  кавычек/переносов и защита от формул в Excel включены.
- `/teacher/homework/[assignmentId]/student/[studentId]` показывает историю попыток,
  все вопросы, варианты, ответ ученика, правильный ответ, объяснение и записанное
  время на вопрос. Комментарии добавляются к сданной работе или конкретному вопросу.
  Отправка одного комментария не сбрасывает черновики других комментариев.

Разбор относится к заданиям **question_set**, которые используют
assignment_submissions/assignment_answers. Старые задания **past_paper** продолжают
открывать обычные экзаменационные попытки; они не связаны со сдачами конкретного
assignment. Для них отображается честное пояснение вместо придуманных результатов,
и существующий запуск пробного варианта сохранён.

## Комментарии, пересдача и время

Новые таблицы:

- `assignment_feedback`: UUID комментария, сдача, необязательный вопрос, автор,
  текст и дата. Комментарии добавляются, но через клиент не редактируются/удаляются.
- `assignment_retake_grants`: одна строка на сданную попытку, которой разрешили
  пересдачу; содержит ученика, задание, автора разрешения и дату.

Лимит ученика = max_attempts задания + число его разрешений. Составной ключ
дополнительных попыток и advisory lock гарантируют: повтор запроса для одной
сдачи добавляет **ровно одну**, а не две попытки. После следующей сдачи учитель
может отдельно разрешить ещё одну. Разрешение выдаётся только последней сданной
попытке текущего участника группы. Базовый лимит для остальных учеников не меняется.

Просмотр результата больше не начинает следующую попытку автоматически. Ученик
видит отдельную кнопку «Начать пересдачу», если у него осталась разрешённая попытка.
В списке домашних заданий появляется ссылка «Есть комментарий учителя» на сдачу,
к которой относится комментарий, включая старую попытку во время пересдачи.

Время выполнения в общей таблице — интервал между started_at и submitted_at,
включая перерывы. Время на вопрос — накопленное видимое время в новом интерфейсе;
скрытая вкладка ставит этот счётчик на паузу. Значение сохраняется с ответом,
при переходе между вопросами и перед отправкой. При повторном сохранении оно
не уменьшается. Для старых ответов с NULL показывается «—», время не выдумывается. При продолжении старой незавершённой попытки собирается только дальнейшее время.

Сохранения и финальная проверка блокируют одну строку сдачи. Завершение подсчитывает
результат по сохранённым серверным оценкам; поздний запрос не может изменить уже
сданные ответы. Интерфейс дожидается очереди сохранений и обрабатывает потерю
ответа сервера после завершения. Вопросы фиксируются после начала первой попытки,
чтобы изменение задания не подменяло вопросы в историческом разборе.

## Безопасность

Учительские API проверяют роль и используют пользовательский JWT с RLS. Работа
выбирается одновременно по заданию, ученику и ID сдачи. Правильные ответы на
сервере загружаются только после проверки доступа к этому заданию.

RLS на assignment_submissions и assignment_answers разрешает учителю читать только
результаты заданий своих групп, admin — все, ученику — только свои сдачи. Чтение
учеником per-question correctness дополнительно закрыто до отправки и до разрешённого
срока показа ответов; правило show_answers='never' продолжает действовать.

RLS комментариев проверяет группу, авторство, статус сдачи и принадлежность вопроса
заданию. Ученик читает свои комментарии только к сданным попыткам, независимо от
разрешения показа ключей ответов. INSERT ученика запрещён политикой, UPDATE/DELETE —
отсутствием прав. Таблицы комментариев/дополнительных попыток имеют явные CRUD GRANT
для service_role; authenticated получает только необходимые права.

`save_verified_assignment_answer` и `finalize_assignment_submission` исполняются
только service_role после проверки реального auth user в API. Клиент не передаёт
доверенные is_correct, score или произвольного student_id.

## Проверка после применения

```sql
select relname, relrowsecurity from pg_class
where oid in ('public.assignment_submissions'::regclass,
              'public.assignment_answers'::regclass,
              'public.assignment_feedback'::regclass,
              'public.assignment_retake_grants'::regclass);
-- У всех true.

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('assignment_feedback','assignment_retake_grants');

select
  has_table_privilege('authenticated','public.assignment_feedback','UPDATE') as student_can_update,
  has_table_privilege('service_role','public.assignment_feedback','SELECT') as server_can_read,
  has_function_privilege('authenticated','public.save_verified_assignment_answer(uuid,uuid,uuid,text,boolean,integer)','EXECUTE') as client_can_grade;
-- false, true, false
```

Проверять RLS нужно от роли authenticated, а не postgres SQL Editor:

```sql
begin;
select set_config('request.jwt.claim.sub',
  (select id::text from auth.users where email='STUDENT_EMAIL'), true);
set local role authenticated;
select * from public.assignment_submissions; -- только свои
select * from public.assignment_feedback; -- только к своим сданным работам
rollback;
```

Для учителя аналогично укажите его email и проверьте сдачи/ответы: чужих групп быть
не должно. Полный набор негативных проверок (включая попытку ученика вставить
комментарий и два одинаковых запроса пересдачи) находится в SQL-тесте ниже.

## Выполненные проверки

- `npm run build`, `npm run lint`, `npm run test:unit`.
- `npm run test:homework-feedback:sql` с внешним PGlite через PGLITE_PATH: выполняет
  настоящие миграции ролей, групп, заданий и обратной связи. Проверяет двух учителей,
  двух учеников, admin, скрытые ответы, запрет комментариев ученика, точный лимит
  пересдач, повторные запросы, серверную проверку, неизменность сданной работы и
  повторную миграцию без потери данных. Рабочая Supabase не используется.
- Браузер на QA-ответах API: сводка, фильтр, сортировка, реальный CSV-файл с одной
  отфильтрованной строкой, работа ученика, комментарий без потери другого черновика,
  отключение повторного разрешения пересдачи, ученическая отметка и просмотр
  комментариев при show_answers='never' без отображения правильных ответов.

Проверки в рабочей Supabase с реальными учебными группами остаются за ручным
применением миграции. Рабочие комментарии/попытки агент не создавал.

## Откат

Сохраните новые таблицы и сдачи. При возврате интерфейса не удаляйте комментарии или
разрешения. Старый интерфейс автоматически начинал новую попытку при открытии
результата, поэтому безопаснее оставить текущую логику просмотра и временно скрыть
новые элементы UI, чем возвращать старый runner. Не отключайте RLS ради доступа.

## Изменённые и добавленные файлы

- `C:/Users/zumad/sat/AGENTS.md`
- `C:/Users/zumad/sat/app/api/homework/attempts/route.ts`
- `C:/Users/zumad/sat/app/api/homework/route.ts`
- `C:/Users/zumad/sat/app/api/teacher/homework/[assignmentId]/report/route.ts`
- `C:/Users/zumad/sat/app/api/teacher/homework/[assignmentId]/student/[studentId]/route.ts`
- `C:/Users/zumad/sat/app/homework/[assignmentId]/page.tsx`
- `C:/Users/zumad/sat/app/teacher/homework/[assignmentId]/student/[studentId]/page.tsx`
- `C:/Users/zumad/sat/components/homework/AssignmentFeedbackList.tsx`
- `C:/Users/zumad/sat/components/homework/AssignmentReport.tsx`
- `C:/Users/zumad/sat/components/homework/HomeworkRunner.tsx`
- `C:/Users/zumad/sat/components/homework/StudentHomeworkPage.tsx`
- `C:/Users/zumad/sat/components/homework/StudentWorkPage.tsx`
- `C:/Users/zumad/sat/components/homework/TeacherHomeworkEditPage.tsx`
- `C:/Users/zumad/sat/docs/assignment-feedback.md`
- `C:/Users/zumad/sat/lib/assignmentReport.ts`
- `C:/Users/zumad/sat/lib/homework.ts`
- `C:/Users/zumad/sat/lib/homeworkClock.ts`
- `C:/Users/zumad/sat/lib/server/assignmentReports.ts`
- `C:/Users/zumad/sat/lib/server/homeworkAttempts.ts`
- `C:/Users/zumad/sat/package.json`
- `C:/Users/zumad/sat/scripts/assignment-feedback-api.test.mjs`
- `C:/Users/zumad/sat/scripts/assignment-report.test.ts`
- `C:/Users/zumad/sat/scripts/homework-api.test.mjs`
- `C:/Users/zumad/sat/scripts/homework-feedback-sql.test.mjs`
- `C:/Users/zumad/sat/supabase/migrations/add_assignment_feedback.sql`
- `C:/Users/zumad/sat/supabase/migrations/add_roles.sql`
- `C:/Users/zumad/sat/types/database.ts`

`AGENTS.md` автоматически создан установленным Next.js при запуске dev-сервера.
