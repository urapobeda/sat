begin;

alter table public.questions
add column if not exists source_question_id text,
add column if not exists source_name text,
add column if not exists category text,
add column if not exists source_page_start integer,
add column if not exists source_page_end integer,
add column if not exists question_type text not null default 'multiple-choice'
  check (question_type in ('multiple-choice', 'student-produced-response'));

create table if not exists public.question_solutions (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_answer text not null,
  explanation text not null,
  solution_steps jsonb,
  scoring_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists questions_source_question_id_key
on public.questions (source_question_id)
where source_question_id is not null;

create temporary table import_questions (
  source_question_id text,
  source_name text,
  section text,
  category text,
  topic text,
  difficulty text,
  question text,
  choices jsonb,
  correct_answer text,
  explanation text,
  is_bluebook boolean,
  question_type text,
  source_page_start integer,
  source_page_end integer
) on commit drop;

insert into import_questions (
  source_question_id,
  source_name,
  section,
  category,
  topic,
  difficulty,
  question,
  choices,
  correct_answer,
  explanation,
  is_bluebook,
  question_type,
  source_page_start,
  source_page_end
)
values
  ('ac472881', 'math', 'math', 'Algebra', 'Algebra', 'hard', 'In the given equation, and are constants, and . If the equation has infinitely many solutions, what is the value of ? Correct Answer: 403 Rationale The correct answer is . For a linear equation in one variable to have infinitely many solutions, the coefficients of the variable must be equal on both sides of the equation and the constant terms must also be equal on both sides of the equation. The given equation can be rewritten as , or . Applying the distributive property to the right-hand side of this equation yields . For this equation to have infinitely many solutions, the coefficients of must be equal, so it follows that . Additionally, the constant terms must be equal, which means . Substituting for in this equation yields , or . Adding to both sides of this equation yields . Adding to both sides of this equation yields . Multiplying both sides of this equation by yields . Therefore, if the equation has infinitely many solutions, the value of is .', '[]'::jsonb, '403', 'The correct answer is . For a linear equation in one variable to have infinitely many solutions, the coefficients of the variable must be equal on both sides of the equation and the constant terms must also be equal on both sides of the equation. The given equation can be rewritten as , or . Applying the distributive property to the right-hand side of this equation yields . For this equation to have infinitely many solutions, the coefficients of must be equal, so it follows that . Additionally, the constant terms must be equal, which means . Substituting for in this equation yields , or . Adding to both sides of this equation yields . Adding to both sides of this equation yields . Multiplying both sides of this equation by yields . Therefore, if the equation has infinitely many solutions, the value of is .', true, 'student-produced-response', 1, 1),
  ('3f5a3602', 'math', 'math', 'Algebra', 'Algebra', 'hard', 'What system of linear equations is represented by the lines shown?', '[]'::jsonb, 'D', 'Choice D is correct. A line in the xy-plane that passes through the points and has slope , where , and can be defined by an equation of the form . One of the lines shown in the graph passes through the points and . Substituting for , for , for , and for in the equation yields , or . Substituting for , for and for in the equation yields , which is equivalent to . Adding to both sides of this equation yields . Multiplying both sides of this equation by yields . Therefore, an equation of this line is . Similarly, the other line shown in the graph passes through the points and . Substituting for , for , for , and for in the equation yields , or . Substituting for , for , and for in the equation yields , which is equivalent to . Adding to both sides of this equation yields . Multiplying both sides of this equation by yields . Therefore, an equation of this line is . So, the system of linear equations represented by the lines shown is and . Choice A is incorrect and may result from conceptual or calculation errors. Choice B is incorrect and may result from conceptual or calculation errors. Choice C is incorrect and may result from conceptual or calculation errors.', true, 'student-produced-response', 2, 3),
  ('3d1070c9', 'math', 'math', 'Algebra', 'Linear Functions', 'easy', 'The function is defined by . What is the value of when ?', '[]'::jsonb, 'C', 'Choice C is correct. It’s given that the function is defined by . Substituting for in this equation yields , which is equivalent to , or . Therefore, the value of is when . Choice A is incorrect. This is the value of , not . Choice B is incorrect. This is the value of , not . Choice D is incorrect. This is the value of , not .', true, 'student-produced-response', 4, 4),
  ('002dba45', 'math', 'math', 'Algebra', 'Algebra', 'medium', 'Line is defined by . Line is perpendicular to line in the xy-plane. What is the slope of line ? Correct Answer: .1764, .1765, 3/17 Rationale The correct answer is . It’s given that line is perpendicular to line in the xy-plane. This means that the slope of line is the negative reciprocal of the slope of line . The equation of line , , is written in slope-intercept form , where is the slope of the line and is the y-coordinate of the y-intercept of the line. It follows that the slope of line is . The negative reciprocal of a number is divided by the number. Therefore, the negative reciprocal of is , or . Thus, the slope of line is . Note that 3/17, .1764, .1765, and 0.176 are examples of ways to enter a correct answer.', '[]'::jsonb, '.1764, .1765, 3/17', 'The correct answer is . It’s given that line is perpendicular to line in the xy-plane. This means that the slope of line is the negative reciprocal of the slope of line . The equation of line , , is written in slope-intercept form , where is the slope of the line and is the y-coordinate of the y-intercept of the line. It follows that the slope of line is . The negative reciprocal of a number is divided by the number. Therefore, the negative reciprocal of is , or . Thus, the slope of line is . Note that 3/17, .1764, .1765, and 0.176 are examples of ways to enter a correct answer.', true, 'student-produced-response', 5, 5),
  ('edc1b7b7', 'math', 'math', 'Algebra', 'Algebra', 'hard', 'The solution to the given system of equations is . What is the value of ? Correct Answer: 3 Rationale The correct answer is . Adding the second equation to the first equation in the given system of equations yields , or . Dividing both sides of this equation by yields . Substituting for in the first equation, , yields , or . Subtracting from both sides of this equation yields . Dividing both sides of this equation by yields . Substituting for and for in the expression yields , or . Therefore, the value of is .', '[]'::jsonb, '3', 'The correct answer is . Adding the second equation to the first equation in the given system of equations yields , or . Dividing both sides of this equation by yields . Substituting for in the first equation, , yields , or . Subtracting from both sides of this equation yields . Dividing both sides of this equation by yields . Substituting for and for in the expression yields , or . Therefore, the value of is .', true, 'student-produced-response', 6, 6),
  ('f224df07', 'math', 'math', 'Algebra', 'Algebra', 'medium', 'A cargo helicopter delivers only 100-pound packages and 120-pound packages. For each delivery trip, the helicopter must carry at least 10 packages, and the total weight of the packages can be at most 1,100 pounds. What is the maximum number of 120-pound packages that the helicopter can carry per trip?', '[{"label":"A","text":"2"},{"label":"B","text":"4"},{"label":"C","text":"5"},{"label":"D","text":"6"}]'::jsonb, '5', 'Choice C is correct. Let a equal the number of 120-pound packages, and let b equal the number of 100-pound packages. It’s given that the total weight of the packages can be at most 1,100 pounds: the inequality represents this situation. It’s also given that the helicopter must carry at least 10 packages: the inequality represents this situation. Values of a and b that satisfy these two inequalities represent the allowable numbers of 120-pound packages and 100-pound packages the helicopter can transport. To maximize the number of 120-pound packages, a, in the helicopter, the number of 100-pound packages, b, in the helicopter needs to be minimized. Expressing b in terms of a in the second inequality yields , so the minimum value of b is equal to . Substituting for b in the first inequality results in . Using the distributive property to rewrite this inequality yields , or . Subtracting 1,000 from both sides of this inequality yields . Dividing both sides of this inequality by 20 results in . This means that the maximum number of 120-pound packages that the helicopter can carry per trip is 5. Choices A, B, and D are incorrect and may result from incorrectly creating or solving the system of inequalities.', true, 'multiple-choice', 7, 7);

insert into public.questions (
  source_question_id,
  source_name,
  section,
  category,
  topic,
  difficulty,
  question,
  choices,
  is_bluebook,
  question_type,
  source_page_start,
  source_page_end
)
select
  nullif(source_question_id, ''),
  source_name,
  section,
  nullif(category, ''),
  topic,
  difficulty,
  question,
  choices,
  is_bluebook,
  question_type,
  source_page_start,
  source_page_end
from import_questions
on conflict (source_question_id) where source_question_id is not null do update
set
  source_name = excluded.source_name,
  section = excluded.section,
  category = excluded.category,
  topic = excluded.topic,
  difficulty = excluded.difficulty,
  question = excluded.question,
  choices = excluded.choices,
  is_bluebook = excluded.is_bluebook,
  question_type = excluded.question_type,
  source_page_start = excluded.source_page_start,
  source_page_end = excluded.source_page_end;

insert into public.question_solutions (
  question_id,
  correct_answer,
  explanation
)
select
  q.id,
  i.correct_answer,
  i.explanation
from import_questions i
join public.questions q
  on q.source_question_id = nullif(i.source_question_id, '')
on conflict (question_id) do update
set
  correct_answer = excluded.correct_answer,
  explanation = excluded.explanation,
  updated_at = now();

commit;
