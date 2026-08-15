/*
# Seed data: colleges, branches, skills, interests, demo students, posts, gossip, teachers, events, clubs, chat rooms

1. Data inserted
- 1 college
- 6 branches (Computer, IT, AI&DS, ENTC, Mechanical, Civil)
- ~16 skills, ~14 interests
- 12 demo student profiles with varied branches/years/auras/scores
- Hidden profiles for each demo student (anonymous codes ZL-xxxx)
- Follow relationships among demo students
- Posts, gossip, confessions, teachers, reviews, events, clubs, chat rooms
2. Notes
- Demo profile IDs are generated and referenced by a helper mapping via username lookups in the app.
- Demo users have is_admin=false, onboarding_completed=true so the app has data to show even before a real user signs in.
- These are clearly seed/demo rows (names are fictional).
- NOTE: profiles.id defaults to auth.uid(), but for seed data we generate explicit UUIDs since there is no auth session.
*/

DO $$
DECLARE
  v_college uuid;
  v_comp uuid; v_it uuid; v_aids uuid; v_entc uuid; v_mech uuid; v_civil uuid;
  v_sahil uuid; v_rahul uuid; v_aryan uuid; v_priya uuid; v_ananya uuid; v_karan uuid;
  v_meera uuid; v_rohan uuid; v_sneha uuid; v_vikram uuid; v_divya uuid; v_arjun uuid;
  v_nikhil uuid; v_isha uuid;
  v_hp_sahil uuid; v_hp_rahul uuid; v_hp_aryan uuid; v_hp_priya uuid; v_hp_ananya uuid; v_hp_karan uuid;
  v_hp_meera uuid; v_hp_rohan uuid; v_hp_sneha uuid; v_hp_vikram uuid; v_hp_divya uuid; v_hp_arjun uuid;
  v_hp_nikhil uuid; v_hp_isha uuid;
BEGIN
  -- College
  INSERT INTO colleges (id, name, city) VALUES ('11111111-1111-1111-1111-111111111111', 'Zeal College of Engineering', 'Pune')
  ON CONFLICT (id) DO NOTHING;
  v_college := '11111111-1111-1111-1111-111111111111';

  -- Branches
  INSERT INTO branches (id, name, short_name, college_id, display_order, is_active) VALUES
    ('22222222-0001-2222-2222-222222222222', 'Computer Engineering', 'Computer', v_college, 1, true),
    ('22222222-0002-2222-2222-222222222222', 'Information Technology', 'IT', v_college, 2, true),
    ('22222222-0003-2222-2222-222222222222', 'AI & Data Science', 'AI&DS', v_college, 3, true),
    ('22222222-0004-2222-2222-222222222222', 'Electronics & Telecommunication', 'ENTC', v_college, 4, true),
    ('22222222-0005-2222-2222-222222222222', 'Mechanical Engineering', 'Mechanical', v_college, 5, true),
    ('22222222-0006-2222-2222-222222222222', 'Civil Engineering', 'Civil', v_college, 6, true)
  ON CONFLICT (id) DO NOTHING;

  v_comp  := '22222222-0001-2222-2222-222222222222';
  v_it    := '22222222-0002-2222-2222-222222222222';
  v_aids  := '22222222-0003-2222-2222-222222222222';
  v_entc  := '22222222-0004-2222-2222-222222222222';
  v_mech  := '22222222-0005-2222-2222-222222222222';
  v_civil := '22222222-0006-2222-2222-222222222222';

  -- Skills
  INSERT INTO skills (name) VALUES
    ('Python'),('Java'),('C++'),('React'),('UI/UX'),('Video Editing'),
    ('Graphic Design'),('Public Speaking'),('JavaScript'),('Node.js'),
    ('Machine Learning'),('Flutter'),('Photography'),('Content Writing'),
    ('Data Analysis'),('Cloud')
  ON CONFLICT (name) DO NOTHING;

  -- Interests
  INSERT INTO interests (name, icon) VALUES
    ('AI','🤖'),('Coding','💻'),('Gaming','🎮'),('Football','⚽'),('Cricket','🏏'),
    ('Music','🎵'),('Photography','📸'),('Startups','🚀'),('Design','🎨'),
    ('Movies','🎬'),('Fitness','💪'),('Reading','📚'),('Dance','💃'),('Anime','🎌')
  ON CONFLICT (name) DO NOTHING;

  -- Demo student profiles (explicit UUIDs, no auth session)
  v_sahil  := 'aaaaaaaa-0001-aaaa-aaaa-aaaaaaaaaaaa';
  v_rahul  := 'aaaaaaaa-0002-aaaa-aaaa-aaaaaaaaaaaa';
  v_aryan  := 'aaaaaaaa-0003-aaaa-aaaa-aaaaaaaaaaaa';
  v_priya  := 'aaaaaaaa-0004-aaaa-aaaa-aaaaaaaaaaaa';
  v_ananya := 'aaaaaaaa-0005-aaaa-aaaa-aaaaaaaaaaaa';
  v_karan  := 'aaaaaaaa-0006-aaaa-aaaa-aaaaaaaaaaaa';
  v_meera  := 'aaaaaaaa-0007-aaaa-aaaa-aaaaaaaaaaaa';
  v_rohan  := 'aaaaaaaa-0008-aaaa-aaaa-aaaaaaaaaaaa';
  v_sneha  := 'aaaaaaaa-0009-aaaa-aaaa-aaaaaaaaaaaa';
  v_vikram := 'aaaaaaaa-0010-aaaa-aaaa-aaaaaaaaaaaa';
  v_divya  := 'aaaaaaaa-0011-aaaa-aaaa-aaaaaaaaaaaa';
  v_arjun  := 'aaaaaaaa-0012-aaaa-aaaa-aaaaaaaaaaaa';
  v_nikhil := 'aaaaaaaa-0013-aaaa-aaaa-aaaaaaaaaaaa';
  v_isha   := 'aaaaaaaa-0014-aaaa-aaaa-aaaaaaaaaaaa';

  INSERT INTO profiles (id, full_name, username, bio, college_id, branch_id, year, gender, show_gender, show_year, is_private, aura_badges, zeal_score, smart_score, game_xp, game_level, follower_count, following_count, post_count, onboarding_completed, is_admin, instagram) VALUES
    (v_sahil, 'Sahil Dhumal', 'sahil', 'AI builder & campus founder. Building NorthWeb.', v_college, v_comp, 2, 'male', true, true, false, ARRAY['🚀 Founder','💻 Tech Builder','🧠 Problem Solver'], 1284, 842, 4200, 27, 1284, 318, 24, true, false, 'sahil.builds'),
    (v_rahul, 'Rahul Sharma', 'rahul', 'Coding enthusiast. 3x hackathon winner.', v_college, v_comp, 3, 'male', true, true, false, ARRAY['💻 Tech Builder','🧠 Problem Solver'], 890, 910, 3100, 22, 890, 201, 18, true, false, NULL),
    (v_aryan, 'Aryan Patel', 'aryan', 'Just here for the vibes. Gaming > everything.', v_college, v_it, 2, 'male', true, true, false, ARRAY['🎮 Competitive Gamer','🔥 Campus Creator'], 654, 520, 8900, 34, 654, 412, 31, true, false, 'aryan.gg'),
    (v_priya, 'Priya Singh', 'priya', 'UI/UX designer. Coffee + Figma = life.', v_college, v_comp, 2, 'female', true, true, false, ARRAY['📸 Creative','🎨 Designer'], 1020, 680, 1500, 15, 1020, 289, 22, true, false, 'priya.designs'),
    (v_ananya, 'Ananya Iyer', 'ananya', 'AI/ML researcher. Data is beautiful.', v_college, v_aids, 3, 'female', true, true, false, ARRAY['🧠 Problem Solver','💻 Tech Builder'], 750, 870, 2800, 20, 750, 178, 15, true, false, NULL),
    (v_karan, 'Karan Mehta', 'karan', 'Mech engg by day, guitarist by night.', v_college, v_mech, 2, 'male', true, true, false, ARRAY['🎵 Musician','🤝 Community Helper'], 530, 410, 900, 11, 530, 220, 9, true, false, 'karan.plays'),
    (v_meera, 'Meera Deshmukh', 'meera', 'Photography & travel. Capturing campus life.', v_college, v_entc, 1, 'female', true, true, false, ARRAY['📸 Creative','🔥 Campus Creator'], 680, 520, 1200, 13, 680, 340, 19, true, false, 'meera.clicks'),
    (v_rohan, 'Rohan Verma', 'rohan', 'Civil engg. Footballer. Sunday league champion.', v_college, v_civil, 3, 'male', true, true, false, ARRAY['⚽ Athlete','🤝 Community Helper'], 410, 350, 600, 8, 410, 150, 7, true, false, NULL),
    (v_sneha, 'Sneha Kulkarni', 'sneha', 'Public speaking champ. Debater. Reader.', v_college, v_it, 2, 'female', true, true, false, ARRAY['🎤 Speaker','📚 Reader'], 590, 640, 1100, 12, 590, 198, 12, true, false, NULL),
    (v_vikram, 'Vikram Nair', 'vikram', 'Full-stack dev. Open source contributor.', v_college, v_comp, 4, 'male', true, true, false, ARRAY['💻 Tech Builder','🤝 Community Helper'], 980, 760, 3400, 24, 980, 256, 28, true, false, 'vikram.dev'),
    (v_divya, 'Divya Rao', 'divya', 'Data science + design hybrid. I make dashboards pretty.', v_college, v_aids, 2, 'female', true, true, false, ARRAY['🎨 Designer','🧠 Problem Solver'], 620, 590, 1700, 16, 620, 187, 14, true, false, NULL),
    (v_arjun, 'Arjun Pillai', 'arjun', 'Entrepreneur in training. Building something cool.', v_college, v_comp, 1, 'male', true, true, false, ARRAY['🚀 Founder','🔥 Campus Creator'], 450, 480, 800, 9, 450, 120, 6, true, false, 'arjun.builds'),
    (v_nikhil, 'Nikhil Joshi', 'nikhil', 'Gaming tournament organizer. Esports captain.', v_college, v_it, 3, 'male', true, true, false, ARRAY['🎮 Competitive Gamer','🤝 Community Helper'], 720, 430, 6700, 29, 720, 390, 21, true, false, 'nikhil.gg'),
    (v_isha, 'Isha Agarwal', 'isha', 'Content creator. Campus vlogs & tech tutorials.', v_college, v_entc, 2, 'female', true, true, false, ARRAY['🔥 Campus Creator','📸 Creative'], 880, 510, 2200, 18, 880, 300, 26, true, false, 'isha.creates')
  ON CONFLICT (id) DO NOTHING;

  -- Hidden profiles for demo students
  INSERT INTO hidden_profiles (id, owner_id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender) VALUES
    ('bbbbbbbb-0001-bbbb-bbbb-bbbbbbbbbbbb', v_sahil, 'ZL-4821', 'sahil', '4', NULL, 'male', true),
    ('bbbbbbbb-0002-bbbb-bbbb-bbbbbbbbbbbb', v_rahul, 'ZL-3392', 'rahul', '2', 'nightowl', 'male', false),
    ('bbbbbbbb-0003-bbbb-bbbb-bbbbbbbbbbbb', v_aryan, 'ZL-7150', 'aryan', '6', NULL, 'male', true),
    ('bbbbbbbb-0004-bbbb-bbbb-bbbbbbbbbbbb', v_priya, 'ZL-9264', 'priya', '3', 'mystery', 'female', true),
    ('bbbbbbbb-0005-bbbb-bbbb-bbbbbbbbbbbb', v_ananya, 'ZL-5037', 'ananya', '5', NULL, 'female', false),
    ('bbbbbbbb-0006-bbbb-bbbb-bbbbbbbbbbbb', v_karan, 'ZL-2841', 'karan', '1', NULL, 'male', true),
    ('bbbbbbbb-0007-bbbb-bbbb-bbbbbbbbbbbb', v_meera, 'ZL-6608', 'meera', '7', 'ghost', 'female', true),
    ('bbbbbbbb-0008-bbbb-bbbb-bbbbbbbbbbbb', v_rohan, 'ZL-1192', 'rohan', '2', NULL, 'male', false),
    ('bbbbbbbb-0009-bbbb-bbbb-bbbbbbbbbbbb', v_sneha, 'ZL-8453', 'sneha', '4', NULL, 'female', true),
    ('bbbbbbbb-0010-bbbb-bbbb-bbbbbbbbbbbb', v_vikram, 'ZL-3001', 'vikram', '6', 'devnull', 'male', true),
    ('bbbbbbbb-0011-bbbb-bbbb-bbbbbbbbbbbb', v_divya, 'ZL-7720', 'divya', '3', NULL, 'female', false),
    ('bbbbbbbb-0012-bbbb-bbbb-bbbbbbbbbbbb', v_arjun, 'ZL-5519', 'arjun', '5', NULL, 'male', true),
    ('bbbbbbbb-0013-bbbb-bbbb-bbbbbbbbbbbb', v_nikhil, 'ZL-2208', 'nikhil', '1', NULL, 'male', true),
    ('bbbbbbbb-0014-bbbb-bbbb-bbbbbbbbbbbb', v_isha, 'ZL-9175', 'isha', '7', NULL, 'female', true)
  ON CONFLICT (id) DO NOTHING;

  v_hp_sahil  := 'bbbbbbbb-0001-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_rahul  := 'bbbbbbbb-0002-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_aryan  := 'bbbbbbbb-0003-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_priya  := 'bbbbbbbb-0004-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_ananya := 'bbbbbbbb-0005-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_karan  := 'bbbbbbbb-0006-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_meera  := 'bbbbbbbb-0007-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_rohan  := 'bbbbbbbb-0008-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_sneha  := 'bbbbbbbb-0009-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_vikram := 'bbbbbbbb-0010-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_divya  := 'bbbbbbbb-0011-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_arjun  := 'bbbbbbbb-0012-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_nikhil := 'bbbbbbbb-0013-bbbb-bbbb-bbbbbbbbbbbb';
  v_hp_isha   := 'bbbbbbbb-0014-bbbb-bbbb-bbbbbbbbbbbb';

  -- Follow relationships (some demo follows)
  INSERT INTO follows (follower_id, followee_id, status) VALUES
    (v_rahul, v_sahil, 'accepted'), (v_aryan, v_sahil, 'accepted'),
    (v_priya, v_sahil, 'accepted'), (v_ananya, v_sahil, 'accepted'),
    (v_sahil, v_rahul, 'accepted'), (v_sahil, v_priya, 'accepted'),
    (v_vikram, v_sahil, 'accepted'), (v_meera, v_sahil, 'accepted'),
    (v_isha, v_sahil, 'accepted'), (v_nikhil, v_aryan, 'accepted'),
    (v_aryan, v_nikhil, 'accepted'), (v_sahil, v_vikram, 'accepted'),
    (v_sneha, v_ananya, 'accepted'), (v_divya, v_ananya, 'accepted'),
    (v_meera, v_priya, 'accepted'), (v_priya, v_meera, 'accepted')
  ON CONFLICT (follower_id, followee_id) DO NOTHING;

  -- Profile skills
  INSERT INTO profile_skills (profile_id, skill_id) SELECT p.id, s.id FROM profiles p, skills s WHERE p.username = 'sahil' AND s.name IN ('Python','React','AI','UI/UX','Java') ON CONFLICT DO NOTHING;
  INSERT INTO profile_skills (profile_id, skill_id) SELECT p.id, s.id FROM profiles p, skills s WHERE p.username = 'rahul' AND s.name IN ('Python','Java','C++','Machine Learning') ON CONFLICT DO NOTHING;
  INSERT INTO profile_skills (profile_id, skill_id) SELECT p.id, s.id FROM profiles p, skills s WHERE p.username = 'priya' AND s.name IN ('UI/UX','React','Graphic Design','Video Editing') ON CONFLICT DO NOTHING;
  INSERT INTO profile_skills (profile_id, skill_id) SELECT p.id, s.id FROM profiles p, skills s WHERE p.username = 'ananya' AND s.name IN ('Python','Machine Learning','Data Analysis') ON CONFLICT DO NOTHING;
  INSERT INTO profile_skills (profile_id, skill_id) SELECT p.id, s.id FROM profiles p, skills s WHERE p.username = 'vikram' AND s.name IN ('JavaScript','Node.js','React','Cloud') ON CONFLICT DO NOTHING;
  INSERT INTO profile_skills (profile_id, skill_id) SELECT p.id, s.id FROM profiles p, skills s WHERE p.username = 'isha' AND s.name IN ('Video Editing','Content Writing','Graphic Design') ON CONFLICT DO NOTHING;

  -- Profile interests
  INSERT INTO profile_interests (profile_id, interest_id) SELECT p.id, i.id FROM profiles p, interests i WHERE p.username = 'sahil' AND i.name IN ('AI','Coding','Startups','Gaming') ON CONFLICT DO NOTHING;
  INSERT INTO profile_interests (profile_id, interest_id) SELECT p.id, i.id FROM profiles p, interests i WHERE p.username = 'aryan' AND i.name IN ('Gaming','Anime','Movies') ON CONFLICT DO NOTHING;
  INSERT INTO profile_interests (profile_id, interest_id) SELECT p.id, i.id FROM profiles p, interests i WHERE p.username = 'priya' AND i.name IN ('Design','Photography','Music') ON CONFLICT DO NOTHING;
  INSERT INTO profile_interests (profile_id, interest_id) SELECT p.id, i.id FROM profiles p, interests i WHERE p.username = 'ananya' AND i.name IN ('AI','Coding','Reading') ON CONFLICT DO NOTHING;

  -- Posts
  INSERT INTO posts (id, author_id, content, post_type, branch_id, like_count, comment_count, created_at) VALUES
    ('cccccccc-0001-cccc-cccc-cccccccccccc', v_sahil, 'Just shipped a new feature for NorthWeb — AI-powered campus assistant. Building in public.', 'text', v_comp, 41, 12, now() - interval '3 hours'),
    ('cccccccc-0002-cccc-cccc-cccccccccccc', v_priya, 'Redesigned the InsideZeal onboarding flow today. Less friction = more students completing setup.', 'text', v_comp, 28, 7, now() - interval '6 hours'),
    ('cccccccc-0003-cccc-cccc-cccccccccccc', v_aryan, 'Who is up for a Valorant custom match tonight? 10pm. Drop your IGN below.', 'text', v_it, 67, 23, now() - interval '2 hours'),
    ('cccccccc-0004-cccc-cccc-cccccccccccc', v_ananya, 'Hot take: transformers are overrated for small datasets. Try gradient boosting first.', 'text', v_aids, 35, 19, now() - interval '8 hours'),
    ('cccccccc-0005-cccc-cccc-cccccccccccc', v_vikram, 'Open-sourced my React component library today. 200+ stars in 2 days. Link in bio.', 'text', v_comp, 52, 9, now() - interval '12 hours'),
    ('cccccccc-0006-cccc-cccc-cccccccccccc', v_isha, 'New campus vlog dropping tomorrow — behind the scenes of the hackathon. Stay tuned!', 'text', v_entc, 38, 5, now() - interval '5 hours'),
    ('cccccccc-0007-cccc-cccc-cccccccccccc', v_rahul, 'Won 3rd place at the national coding championship! Grateful for the team.', 'text', v_comp, 89, 31, now() - interval '1 day'),
    ('cccccccc-0008-cccc-cccc-cccccccccccc', v_meera, 'Golden hour on campus today. Swipe for more.', 'text', v_entc, 44, 8, now() - interval '4 hours')
  ON CONFLICT (id) DO NOTHING;

  -- Gossip posts (anonymous)
  INSERT INTO gossip_posts (hidden_profile_id, content, category, view_count, like_count, comment_count, created_at) VALUES
    (v_hp_aryan, 'Apparently the canteen is getting a new menu next week. Finally.', 'trending', 284, 41, 17, now() - interval '1 hour'),
    (v_hp_priya, 'Someone left a full laptop in the library yesterday and still has not claimed it. How?', 'trending', 192, 23, 9, now() - interval '3 hours'),
    (v_hp_karan, 'The WiFi in the mechanical block has been down for 3 days. Nobody is talking about it.', 'latest', 341, 67, 28, now() - interval '5 hours'),
    (v_hp_sneha, 'Word is the coding club is planning a 24-hour hackathon next month.', 'trending', 456, 89, 34, now() - interval '7 hours'),
    (v_hp_vikram, 'Best campus snack is and will always be the samosa from the outside stall. Fight me.', 'latest', 512, 102, 45, now() - interval '10 hours')
  ON CONFLICT DO NOTHING;

  -- Confessions
  INSERT INTO confessions (hidden_profile_id, content, category, like_count, comment_count, created_at) VALUES
    (v_hp_meera, 'I have a crush on someone in my AI class but I am too scared to even make eye contact.', 'crush', 67, 23, now() - interval '2 hours'),
    (v_hp_rohan, 'I pretended to understand React in a project interview. I did not. I got the role anyway.', 'funny', 89, 31, now() - interval '4 hours'),
    (v_hp_divya, 'I sometimes feel like I do not belong here. Everyone seems smarter than me.', 'confession', 145, 56, now() - interval '6 hours'),
    (v_hp_arjun, 'Advice needed: how do you balance a startup with exams? I am drowning.', 'advice', 34, 18, now() - interval '8 hours'),
    (v_hp_nikhil, 'Rant: group projects where one person does everything and still shares credit equally.', 'rant', 78, 29, now() - interval '12 hours')
  ON CONFLICT DO NOTHING;

  -- Teachers
  INSERT INTO teachers (id, name, department, branch_id, avg_teaching, avg_explanation, avg_approachability, avg_practical, avg_overall, review_count) VALUES
    ('dddddddd-0001-dddd-dddd-dddddddddddd', 'Dr. Rajesh Kulkarni', 'Computer Engineering', v_comp, 4.5, 4.3, 4.2, 4.0, 4.25, 12),
    ('dddddddd-0002-dddd-dddd-dddddddddddd', 'Prof. Sunita Patil', 'Information Technology', v_it, 4.0, 4.2, 4.6, 3.8, 4.15, 9),
    ('dddddddd-0003-dddd-dddd-dddddddddddd', 'Dr. Amit Deshpande', 'AI & Data Science', v_aids, 4.7, 4.5, 4.4, 4.3, 4.475, 7),
    ('dddddddd-0004-dddd-dddd-dddddddddddd', 'Prof. Meena Shah', 'Electronics', v_entc, 3.8, 3.5, 4.1, 3.6, 3.75, 14),
    ('dddddddd-0005-dddd-dddd-dddddddddddd', 'Dr. Vikas Rao', 'Mechanical Engineering', v_mech, 4.2, 4.0, 3.9, 4.4, 4.125, 6)
  ON CONFLICT (id) DO NOTHING;

  -- Teacher reviews
  INSERT INTO teacher_reviews (teacher_id, hidden_profile_id, rating_teaching, rating_explanation, rating_approachability, rating_practical, content, helpful_count, created_at) VALUES
    ('dddddddd-0001-dddd-dddd-dddddddddddd', v_hp_rahul, 5, 4, 4, 4, 'Excellent teacher. Makes complex DSA topics easy to understand with real examples.', 12, now() - interval '2 days'),
    ('dddddddd-0001-dddd-dddd-dddddddddddd', v_hp_sneha, 4, 4, 5, 4, 'Very approachable. Always willing to help after class.', 8, now() - interval '5 days'),
    ('dddddddd-0003-dddd-dddd-dddddddddddd', v_hp_ananya, 5, 5, 4, 4, 'Best ML professor on campus. Projects are challenging but rewarding.', 15, now() - interval '3 days'),
    ('dddddddd-0004-dddd-dddd-dddddddddddd', v_hp_meera, 4, 3, 5, 3, 'Kind person but lectures can be hard to follow. Slides help a lot.', 6, now() - interval '1 week')
  ON CONFLICT DO NOTHING;

  -- Clubs
  INSERT INTO clubs (id, name, slug, description, category, member_count, is_verified) VALUES
    ('eeeeeeee-0001-eeee-eeee-eeeeeeeeeeee', 'Coding Club', 'coding-club', 'The official coding community. Hackathons, contests, and weekly problem-solving sessions.', 'technical', 320, true),
    ('eeeeeeee-0002-eeee-eeee-eeeeeeeeeeee', 'Photography Club', 'photography-club', 'Capture campus life. Weekly photowalks and annual exhibitions.', 'cultural', 180, true),
    ('eeeeeeee-0003-eeee-eeee-eeeeeeeeeeee', 'Gaming Society', 'gaming-society', 'Esports tournaments, casual game nights, and a community of campus gamers.', 'sports', 450, true),
    ('eeeeeeee-0004-eeee-eeee-eeeeeeeeeeee', 'Dance Crew', 'dance-crew', 'Hip-hop, contemporary, and classical. We perform at every campus event.', 'cultural', 95, false),
    ('eeeeeeee-0005-eeee-eeee-eeeeeeeeeeee', 'Music Club', 'music-club', 'Jam sessions, open mics, and the annual music festival.', 'cultural', 140, true)
  ON CONFLICT (id) DO NOTHING;

  -- Events
  INSERT INTO events (id, title, description, organizer, club_id, event_date, venue, category, interested_count, created_by) VALUES
    ('ffffffff-0001-ffff-ffff-ffffffffffff', 'Zeal Hackathon 2026', '48-hour hackathon. Build something amazing. Prizes for top 3 teams.', 'Coding Club', 'eeeeeeee-0001-eeee-eeee-eeeeeeeeeeee', now() + interval '10 days', 'Main Auditorium', 'technical', 234, v_sahil),
    ('ffffffff-0002-ffff-ffff-ffffffffffff', 'Campus Photography Exhibition', 'Annual showcase of student photography. Free entry for all.', 'Photography Club', 'eeeeeeee-0002-eeee-eeee-eeeeeeeeeeee', now() + interval '5 days', 'Art Gallery', 'cultural', 89, v_meera),
    ('ffffffff-0003-ffff-ffff-ffffffffffff', 'Valorant Championship', 'Inter-college Valorant tournament. Register your team of 5.', 'Gaming Society', 'eeeeeeee-0003-eeee-eeee-eeeeeeeeeeee', now() + interval '3 days', 'Gaming Lounge', 'sports', 156, v_nikhil),
    ('ffffffff-0004-ffff-ffff-ffffffffffff', 'AI Workshop: LLMs in Practice', 'Hands-on workshop on building with large language models.', 'Coding Club', 'eeeeeeee-0001-eeee-eeee-eeeeeeeeeeee', now() + interval '7 days', 'Seminar Hall 2', 'technical', 112, v_ananya),
    ('ffffffff-0005-ffff-ffff-ffffffffffff', 'Open Mic Night', 'Music, poetry, comedy. All welcome to perform or watch.', 'Music Club', 'eeeeeeee-0005-eeee-eeee-eeeeeeeeeeee', now() + interval '2 days', 'Amphitheater', 'cultural', 67, v_karan)
  ON CONFLICT (id) DO NOTHING;

  -- Projects
  INSERT INTO projects (owner_id, title, description, technologies, project_url, github_url, looking_for_teammates, like_count) VALUES
    (v_sahil, 'NorthWeb', 'AI-powered personal campus assistant. Helps students find events, clubs, and teammates.', ARRAY['AI','Python','React','Voice'], 'https://northweb.in', 'https://github.com/sahil/northweb', false, 41),
    (v_ananya, 'DataViz Dashboard', 'Interactive dashboard for visualizing campus academic data with ML insights.', ARRAY['Python','ML','React'], NULL, 'https://github.com/ananya/dataviz', true, 23),
    (v_vikram, 'OpenUI', 'Open-source React component library with 50+ accessible components.', ARRAY['React','TypeScript','CSS'], 'https://openui.dev', 'https://github.com/vikram/openui', false, 52),
    (v_priya, 'DesignSystem', 'A Figma design system template for student startups.', ARRAY['UI/UX','Figma'], NULL, NULL, false, 18),
    (v_arjun, 'QuickShip', 'A tool to scaffold and deploy full-stack apps in under 5 minutes.', ARRAY['Node.js','React','Cloud'], NULL, 'https://github.com/arjun/quickship', true, 12)
  ON CONFLICT DO NOTHING;

  -- Achievements
  INSERT INTO achievements (owner_id, title, description, category, achievement_date) VALUES
    (v_rahul, 'National Coding Championship 3rd Place', 'Competed against 500+ students nationally. Won 3rd place.', 'coding', '2025-03-15'),
    (v_sahil, 'Smart India Hackathon Winner', 'Led team to victory at the national Smart India Hackathon.', 'hackathon', '2025-06-20'),
    (v_vikram, 'AWS Cloud Certification', 'Certified Solutions Architect Associate.', 'certification', '2025-01-10'),
    (v_rohan, 'Inter-college Football MVP', 'Most valuable player in the regional football tournament.', 'sports', '2025-02-28'),
    (v_priya, 'Design Conference Speaker', 'Spoke at the national student design conference.', 'club', '2025-04-05')
  ON CONFLICT DO NOTHING;

  -- Marketplace
  INSERT INTO marketplace_listings (seller_id, title, description, price, condition, category) VALUES
    (v_sneha, 'Engineering Graphics Textbook', 'First year EG textbook. Barely used, no annotations.', 250, 'like_new', 'books'),
    (v_vikram, 'Raspberry Pi 4 (4GB)', 'Used for one project. Works perfectly. Includes case and charger.', 1800, 'good', 'electronics'),
    (v_rohan, 'Hero Cycle', '3 years old. Good condition. Recently serviced.', 3500, 'fair', 'cycles'),
    (v_divya, 'Scientific Calculator FX-991ES', 'Perfect working condition. Required for semester exams.', 400, 'good', 'calculators')
  ON CONFLICT DO NOTHING;

  -- Lost & Found
  INSERT INTO lost_found_items (owner_id, type, item_name, description, location, item_date) VALUES
    (v_meera, 'lost', 'Blue Water Bottle', 'Hydro Flask blue water bottle. Has a sticker of a cat.', 'Library 2nd floor', '2026-08-14'),
    (v_karan, 'found', 'Black Earbuds Case', 'Found a black earbuds case near the canteen. No earbuds inside.', 'Canteen entrance', '2026-08-13'),
    (v_isha, 'lost', 'Notes Notebook', 'Blue notebook with AI/ML notes. Very important for exam prep.', 'Lecture Hall 3', '2026-08-12')
  ON CONFLICT DO NOTHING;

  -- Builders
  INSERT INTO builders (owner_id, name, description, category, founder_role, follower_count, is_trending) VALUES
    (v_sahil, 'NorthWeb', 'AI-powered campus assistant platform.', 'tech', 'Founder & CEO', 234, true),
    (v_arjun, 'QuickShip', 'Deploy full-stack apps in under 5 minutes.', 'tech', 'Founder', 89, false),
    (v_isha, 'IshaCreates', 'Campus content studio — vlogs, tutorials, brand videos.', 'creative', 'Founder', 312, true),
    (v_karan, 'Strings & Co', 'Custom guitar string e-shop for musicians.', 'local', 'Founder', 45, false)
  ON CONFLICT DO NOTHING;

  -- Team requests
  INSERT INTO team_requests (owner_id, title, description, required_skills, team_size, deadline) VALUES
    (v_ananya, 'AI Research Project', 'Working on a paper about efficient LLM inference. Need 1 frontend dev and 1 ML engineer.', ARRAY['React','Python','Machine Learning'], 3, '2026-09-01'),
    (v_arjun, 'Hackathon Team', 'Need 1 frontend developer and 1 UI designer for upcoming hackathon.', ARRAY['React','UI/UX'], 3, '2026-08-25')
  ON CONFLICT DO NOTHING;

  -- Chat rooms
  INSERT INTO chat_rooms (id, name, slug, type, branch_id, icon, member_count) VALUES
    ('99999999-0001-9999-9999-999999999999', 'Everyone', 'everyone', 'everyone', NULL, '🌐', 1240),
    ('99999999-0002-9999-9999-999999999999', 'Computer', 'computer', 'branch', v_comp, '💻', 380),
    ('99999999-0003-9999-9999-999999999999', 'IT', 'it', 'branch', v_it, '🖥️', 210),
    ('99999999-0004-9999-9999-999999999999', 'AI & DS', 'ai-ds', 'branch', v_aids, '🤖', 160),
    ('99999999-0005-9999-9999-999999999999', 'Gaming', 'gaming', 'gaming', NULL, '🎮', 540),
    ('99999999-0006-9999-9999-999999999999', 'Study', 'study', 'study', NULL, '📚', 320),
    ('99999999-0007-9999-9999-999999999999', 'Sports', 'sports', 'sports', NULL, '⚽', 180),
    ('99999999-0008-9999-9999-999999999999', 'Projects', 'projects', 'projects', NULL, '🚀', 290)
  ON CONFLICT (id) DO NOTHING;

  -- Chat messages
  INSERT INTO chat_messages (room_id, author_id, content, created_at) VALUES
    ('99999999-0001-9999-9999-999999999999', v_sahil, 'Hey everyone! Welcome to InsideZeal chat. Be kind, have fun.', now() - interval '1 hour'),
    ('99999999-0001-9999-9999-999999999999', v_aryan, 'Finally a proper campus chat. This is going to be fun.', now() - interval '55 minutes'),
    ('99999999-0001-9999-9999-999999999999', v_priya, 'The design looks so clean. Great work team!', now() - interval '40 minutes'),
    ('99999999-0002-9999-9999-999999999999', v_vikram, 'Anyone working on interesting projects this semester?', now() - interval '30 minutes'),
    ('99999999-0002-9999-9999-999999999999', v_rahul, 'Building a chess engine in C++. Slowly losing my mind.', now() - interval '25 minutes'),
    ('99999999-0005-9999-9999-999999999999', v_nikhil, 'Valorant custom tonight 10pm. Who is in?', now() - interval '20 minutes')
  ON CONFLICT DO NOTHING;

  -- Smart challenges
  INSERT INTO smart_challenges (title, description, challenge_type, category, questions, xp_reward, is_daily, scheduled_date) VALUES
    ('Daily Logic Puzzle', 'Solve the sequence and pick the correct next value.', 'logic', 'problem_solving',
      '[{"question":"What comes next: 2, 6, 12, 20, 30, ?","options":["36","40","42","44"],"correct":2}]'::jsonb,
      15, true, CURRENT_DATE),
    ('Coding MCQ: Big-O', 'Test your understanding of algorithm complexity.', 'mcq', 'coding',
      '[{"question":"What is the time complexity of binary search?","options":["O(n)","O(n log n)","O(log n)","O(1)"],"correct":2}]'::jsonb,
      10, true, CURRENT_DATE),
    ('Knowledge: Web Protocols', 'Quick quiz on common web protocols.', 'quiz', 'knowledge',
      '[{"question":"Which protocol is connectionless?","options":["TCP","UDP","HTTP","FTP"],"correct":1}]'::jsonb,
      10, false, NULL)
  ON CONFLICT DO NOTHING;

END $$;
