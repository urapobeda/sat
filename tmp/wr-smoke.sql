begin;

alter table public.questions
add column if not exists source_question_id text,
add column if not exists source_name text,
add column if not exists category text,
add column if not exists source_page_start integer,
add column if not exists source_page_end integer,
add column if not exists image_urls jsonb not null default '[]'::jsonb,
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

drop index if exists questions_source_question_id_key;

create unique index questions_source_question_id_key
on public.questions (source_question_id);

create temporary table import_questions (
  source_question_id text,
  source_name text,
  section text,
  category text,
  topic text,
  difficulty text,
  question text,
  choices jsonb,
  image_urls jsonb,
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
  image_urls,
  correct_answer,
  explanation,
  is_bluebook,
  question_type,
  source_page_start,
  source_page_end
)
values
  ('f1bfbed3', 'wr', 'reading-writing', 'Information and Ideas', 'Inferences', 'hard', 'Marta Coll and colleagues’ 2010 Mediterranean Sea biodiversity census reported approximately 17,000 species, nearly double the number reported in Carlo Bianchi and Carla Morri’s 2000 census—a difference only partly attributable to the description of new invertebrate species in the interim. Another factor is that the morphological variability of microorganisms is poorly understood compared to that of vertebrates, invertebrates, plants, and algae, creating uncertainty about how to evaluate microorganisms as species. Researchers’ decisions on such matters therefore can be highly consequential. Indeed, the two censuses reported similar counts of vertebrate, plant, and algal species, suggesting that ______ Which choice most logically completes the text?', '[{"label":"A","text":"Coll and colleagues reported a much higher number of species than Bianchi and Morri did largely due to the inclusion of invertebrate species that had not been described at the time of Bianchi and Morri’s census."},{"label":"B","text":"some differences observed in microorganisms may have been treated as variations within species by Bianchi and Morri but treated as indicative of distinct species by Coll and colleagues."},{"label":"C","text":"Bianchi and Morri may have been less sensitive to the degree of morphological variation displayed within a typical species of microorganism than Coll and colleagues were."},{"label":"D","text":"the absence of clarity regarding how to differentiate among species of microorganisms may have resulted in Coll and colleagues underestimating the number of microorganism species."}]'::jsonb, '[]'::jsonb, 'some differences observed in microorganisms may have been treated as variations within species by Bianchi and Morri but treated as indicative of distinct species by Coll and colleagues.', 'Choice B is the best answer because it presents the conclusion that most logically completes the text’s discussion of the different counts of species in the Mediterranean Sea. The text states that Coll and colleagues reported almost double the number of species that Bianchi and Morri reported in their study ten years earlier. According to the text, this difference can only be partly attributed to new invertebrate species being described in the years between the two studies, which means there must be an additional factor that made Coll and colleagues’ count so much higher than Bianchi and Morri’s count. The text goes on to explain that factor: researchers have a relatively poor understanding of microorganisms’ morphological variability, or the differences in microorganisms’ structure and form. This poor understanding makes it hard to classify microorganisms by species and means that researchers’ decisions about classifying microorganisms can have a large effect on the overall species counts that researchers report. Additionally, the text says that the two censuses reported similar numbers of vertebrate, plant, and algal species, which means that the difference in overall species did not come from differences in those categories. Given all this information, it most logically follows that Coll and colleagues may have treated some of the differences among microorganisms as indicative of the microorganisms being different species, whereas Bianchi and Morri treated those differences as variations within species, resulting in Coll and colleagues reporting many more species than Bianchi and Morri did. Choice A is incorrect because the text explicitly addresses this issue by stating that the description of new invertebrate species in the years between the two studies can explain only part of the difference in the number of species reported by the studies. The focus of the text is on explaining the difference between Coll and colleagues’ count and Bianchi and Morri’s count that cannot be accounted for by the inclusion of invertebrate species that had not been described at the time of Bianchi and Morri’s study. Choice C is incorrect because nothing in the text suggests that Bianchi and Morri may have been less sensitive to how much the form and structure of microorganisms vary within the same species than Coll and colleagues were. If Bianchi and Morri had been less sensitive to within-species variation than Coll and colleagues were, Bianchi and Morri would likely have reported more species than Coll and colleagues did, since less sensitivity to within-species variation would lead researchers to classify as different species microorganisms that more sensitive researchers would classify as variations within the same species. The text indicates, however, that Bianchi and Morri reported far fewer species than Coll and colleagues did; since the text also excludes other explanations for this difference, it suggests that in fact Bianchi and Morri were more sensitive to within-species variation than Coll and colleagues were, leading Bianchi and Morri to report fewer overall species. Choice D is incorrect because the text is focused on explaining why Coll and colleagues reported many more species than Bianchi and Morri did, and an underestimate of the number of microorganism species by Coll and colleagues would not explain that difference—it would suggest, in fact, that the difference in the number of species should have been even larger.', true, 'multiple-choice', 1, 2),
  ('87aa7bab', 'wr', 'reading-writing', 'Information and Ideas', 'Central Ideas and Details', 'medium', 'A common assumption among art historians is that the invention of photography in the mid-nineteenth century displaced the painted portrait in the public consciousness. The diminishing popularity of the portrait miniature, which coincided with the rise of photography, seems to support this claim. However, photography’s impact on the portrait miniature may be overstated. Although records from art exhibitions in the Netherlands from 1820 to 1892 show a decrease in the number of both full-sized and miniature portraits submitted, this trend was established before the invention of photography. Based on the text, what can be concluded about the diminishing popularity of the portrait miniature in the nineteenth century?', '[{"label":"A","text":"Factors other than the rise of photography may be more directly responsible for the portrait miniature’s decline."},{"label":"B","text":"Although portrait miniatures became less common than photographs, they were widely regarded as having more artistic merit."},{"label":"C","text":"The popularity of the portrait miniature likely persisted for longer than art historians have assumed."},{"label":"D","text":"As demand for portrait miniatures decreased, portrait artists likely shifted their creative focus to photography."}]'::jsonb, '[]'::jsonb, 'Factors other than the rise of photography may be more directly responsible for the portrait miniature’s decline.', 'Choice A is the best answer. The text says that the impact of photography on the portrait miniature might be "overstated," as some records show a decrease in the number of portrait miniatures before the invention of photography. From this, we can conclude that factors other than the rise of photography may be more directly responsible for the portrait miniature’s decline. Choice B is incorrect. The text never discusses the "artistic merit" of either art form. Choice C is incorrect. The text never suggests that the portrait miniature was popular for longer than historians thought—if anything, it suggests that the portrait miniature started losing its popularity earlier than historians thought. Choice D is incorrect. The text never suggests that portrait painters shifted to become photographers.', true, 'multiple-choice', 3, 3),
  ('d73a908a', 'wr', 'reading-writing', 'Information and Ideas', 'Central Ideas and Details', 'medium', 'Believing that living in an impractical space can heighten awareness and even improve health, conceptual artists Madeline Gins and Shusaku Arakawa designed an apartment building in Japan to be more fanciful than functional. A kitchen counter is chest-high on one side and knee-high on the other; a ceiling has a door to nowhere. The effect is disorienting but invigorating: after four years there, filmmaker Nobu Yamaoka reported significant health benefits. Which choice best states the main idea of the text?', '[{"label":"A","text":"Although inhabiting a home surrounded by fanciful features such as those designed by Gins and Arakawa can be rejuvenating, it is unsustainable."},{"label":"B","text":"Designing disorienting spaces like those in the Gins and Arakawa building is the most effective way to create a physically stimulating environment."},{"label":"C","text":"As a filmmaker, Yamaoka has long supported the designs of conceptual artists such as Gins and Arakawa."},{"label":"D","text":"Although impractical, the design of the apartment building by Gins and Arakawa may improve the well-being of the building’s residents."}]'::jsonb, '[]'::jsonb, 'Although impractical, the design of the apartment building by Gins and Arakawa may improve the well-being of the building’s residents.', 'Choice D is the best answer because it most accurately states the main idea of the text. According to the text, conceptual artists Gins and Arakawa have designed an apartment building that is disorienting because of several unconventional elements, such as uneven kitchen counters and “a door to nowhere.” The text goes on to suggest that there may be benefits to this kind of design because filmmaker Yamaoka lived in the apartment building for four years and reported health benefits. Thus, although the design is impractical, it may improve the well-being of the apartment building’s residents. Choice A is incorrect. Although the text mentions that Yamaoka lived in the apartment for four years, it doesn’t address how long someone can beneficially live in a home surrounded by fanciful features or whether doing so can be sustained. Choice B is incorrect. Although the text mentions the potential benefits of living in a home with disorienting design features, it doesn’t suggest that this is the most effective method to create a physically stimulating environment. Choice C is incorrect because the text refers to Yamaoka to support the claim that Gins and Arakawa’s apartment building design may be beneficial, but the text doesn’t indicate that Yamaoka supports the designs of other conceptual artists.', true, 'multiple-choice', 4, 4);

insert into public.questions (
  source_question_id,
  source_name,
  section,
  category,
  topic,
  difficulty,
  question,
  choices,
  image_urls,
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
  image_urls,
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
  image_urls = excluded.image_urls,
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
