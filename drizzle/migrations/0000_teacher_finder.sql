CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_roles ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE TABLE public.departments (id text PRIMARY KEY, name text NOT NULL UNIQUE);
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_departments ON public.departments FOR SELECT USING(true);
CREATE POLICY admin_departments ON public.departments FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, department_id text NOT NULL REFERENCES public.departments(id), cabin text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', designation text NOT NULL DEFAULT 'Assistant Professor', portrait integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.teachers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_teachers ON public.teachers FOR SELECT USING(true);
CREATE POLICY admin_teachers ON public.teachers FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.schedule_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE, day_of_week integer NOT NULL CHECK(day_of_week BETWEEN 0 AND 6), start_time time NOT NULL, end_time time NOT NULL, activity text NOT NULL, location text NOT NULL DEFAULT '', type text NOT NULL CHECK(type IN ('Lecture','Lab','Meeting','Free')), CHECK(start_time<end_time));
GRANT SELECT ON public.schedule_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.schedule_entries TO authenticated;
GRANT ALL ON public.schedule_entries TO service_role;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_schedules ON public.schedule_entries FOR SELECT USING(true);
CREATE POLICY admin_schedules ON public.schedule_entries FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE INDEX schedule_teacher_day ON public.schedule_entries(teacher_id,day_of_week);
CREATE INDEX teacher_department ON public.teachers(department_id);
CREATE FUNCTION public.validate_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF EXISTS(SELECT 1 FROM public.schedule_entries WHERE teacher_id=NEW.teacher_id AND day_of_week=NEW.day_of_week AND id<>NEW.id AND start_time<NEW.end_time AND end_time>NEW.start_time) THEN RAISE EXCEPTION 'This time overlaps another timetable entry.'; END IF; RETURN NEW; END $$;
CREATE TRIGGER no_overlap BEFORE INSERT OR UPDATE ON public.schedule_entries FOR EACH ROW EXECUTE FUNCTION public.validate_schedule();
CREATE FUNCTION public.touch_schedule_update() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN UPDATE public.teachers SET updated_at=now() WHERE id=COALESCE(NEW.teacher_id,OLD.teacher_id); IF TG_OP='UPDATE' AND OLD.teacher_id<>NEW.teacher_id THEN UPDATE public.teachers SET updated_at=now() WHERE id=OLD.teacher_id; END IF; RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER schedule_updated AFTER INSERT OR UPDATE OR DELETE ON public.schedule_entries FOR EACH ROW EXECUTE FUNCTION public.touch_schedule_update();
INSERT INTO public.departments(id,name) VALUES ('CSE','Computer Science & Engineering'),('ECE','Electronics & Communication'),('IT','Information Technology'),('ME','Mechanical Engineering');
INSERT INTO public.teachers(id,name,department_id,cabin,email,designation,portrait) VALUES
('00000000-0000-4000-8000-000000000001','Dr. Rajesh Sharma','CSE','C-305','rajesh.sharma@example.edu','Professor & Head',0),
('00000000-0000-4000-8000-000000000002','Dr. Priya Patel','CSE','C-302','priya.patel@example.edu','Associate Professor',5),
('00000000-0000-4000-8000-000000000003','Prof. Amit Kumar','ECE','E-201','amit.kumar@example.edu','Assistant Professor',1),
('00000000-0000-4000-8000-000000000004','Dr. Sneha Reddy','IT','I-104','sneha.reddy@example.edu','Associate Professor',6),
('00000000-0000-4000-8000-000000000005','Prof. Vikram Singh','ME','M-208','vikram.singh@example.edu','Assistant Professor',2),
('00000000-0000-4000-8000-000000000006','Dr. Ananya Das','ECE','E-203','ananya.das@example.edu','Professor',7),
('00000000-0000-4000-8000-000000000007','Prof. Rahul Mehta','IT','I-106','rahul.mehta@example.edu','Assistant Professor',3),
('00000000-0000-4000-8000-000000000008','Dr. Kavita Rao','ME','M-210','kavita.rao@example.edu','Associate Professor',8),
('00000000-0000-4000-8000-000000000009','Dr. Suresh Nair','CSE','C-308','suresh.nair@example.edu','Professor',4),
('00000000-0000-4000-8000-000000000010','Prof. Neha Gupta','IT','I-108','neha.gupta@example.edu','Assistant Professor',9);
INSERT INTO public.schedule_entries(teacher_id,day_of_week,start_time,end_time,activity,location,type) VALUES
('00000000-0000-4000-8000-000000000001',1,'09:00','10:00','CSE Lecture','C-101','Lecture'),('00000000-0000-4000-8000-000000000001',1,'10:00','11:00','CSE Lecture','C-204','Lecture'),('00000000-0000-4000-8000-000000000001',1,'11:00','12:00','Office hours','C-305','Free'),('00000000-0000-4000-8000-000000000001',1,'13:00','14:00','Programming Lab','Lab-2','Lab'),
('00000000-0000-4000-8000-000000000002',1,'09:00','11:00','Office hours','C-302','Free'),('00000000-0000-4000-8000-000000000002',1,'11:00','12:00','Data Structures','C-102','Lecture'),('00000000-0000-4000-8000-000000000003',1,'09:00','12:00','Analog Electronics Lab','Lab E-1','Lab'),('00000000-0000-4000-8000-000000000004',1,'10:00','12:00','Office hours','I-104','Free'),('00000000-0000-4000-8000-000000000005',1,'10:00','11:00','Thermodynamics','M-101','Lecture'),('00000000-0000-4000-8000-000000000005',1,'11:00','12:00','Office hours','M-208','Free'),('00000000-0000-4000-8000-000000000006',1,'10:00','12:00','Department meeting','Meeting Room E-2','Meeting'),('00000000-0000-4000-8000-000000000007',1,'09:00','12:00','Office hours','I-106','Free'),('00000000-0000-4000-8000-000000000008',1,'09:00','11:00','Engineering Mechanics','M-104','Lecture'),('00000000-0000-4000-8000-000000000009',1,'11:00','12:00','Office hours','C-308','Free'),('00000000-0000-4000-8000-000000000010',1,'10:00','11:00','Web Technology','I-201','Lecture'),('00000000-0000-4000-8000-000000000010',1,'11:00','12:00','Office hours','I-108','Free'),
('00000000-0000-4000-8000-000000000001',2,'09:00','11:00','Algorithms','C-204','Lecture'),('00000000-0000-4000-8000-000000000001',3,'10:00','12:00','Office hours','C-305','Free'),('00000000-0000-4000-8000-000000000001',4,'13:00','15:00','Programming Lab','Lab-2','Lab'),('00000000-0000-4000-8000-000000000001',5,'10:00','11:00','Faculty meeting','Meeting Room C','Meeting'),
('00000000-0000-4000-8000-000000000002',2,'11:00','13:00','Database Lab','Lab C-3','Lab'),('00000000-0000-4000-8000-000000000002',3,'09:00','11:00','Data Structures','C-102','Lecture'),('00000000-0000-4000-8000-000000000002',4,'10:00','12:00','Office hours','C-302','Free'),('00000000-0000-4000-8000-000000000002',5,'13:00','14:00','Project review','C-302','Meeting'),
('00000000-0000-4000-8000-000000000003',2,'09:00','11:00','Circuit Theory','E-101','Lecture'),('00000000-0000-4000-8000-000000000003',3,'10:00','12:00','Office hours','E-201','Free'),('00000000-0000-4000-8000-000000000003',4,'13:00','15:00','Electronics Lab','Lab E-1','Lab'),('00000000-0000-4000-8000-000000000003',5,'09:00','11:00','Digital Systems','E-102','Lecture'),
('00000000-0000-4000-8000-000000000004',2,'10:00','12:00','Computer Networks','I-201','Lecture'),('00000000-0000-4000-8000-000000000004',3,'13:00','15:00','Network Lab','Lab I-1','Lab'),('00000000-0000-4000-8000-000000000004',4,'09:00','11:00','Office hours','I-104','Free'),('00000000-0000-4000-8000-000000000004',5,'10:00','12:00','Computer Networks','I-201','Lecture'),
('00000000-0000-4000-8000-000000000005',2,'13:00','15:00','Workshop','Workshop M-1','Lab'),('00000000-0000-4000-8000-000000000005',3,'09:00','11:00','Thermodynamics','M-101','Lecture'),('00000000-0000-4000-8000-000000000005',4,'10:00','12:00','Office hours','M-208','Free'),('00000000-0000-4000-8000-000000000005',5,'13:00','14:00','Project review','M-208','Meeting'),
('00000000-0000-4000-8000-000000000006',2,'09:00','11:00','Signal Processing','E-103','Lecture'),('00000000-0000-4000-8000-000000000006',3,'10:00','12:00','Office hours','E-203','Free'),('00000000-0000-4000-8000-000000000006',4,'13:00','15:00','Signals Lab','Lab E-2','Lab'),('00000000-0000-4000-8000-000000000006',5,'09:00','10:00','Faculty meeting','Meeting Room E-2','Meeting'),
('00000000-0000-4000-8000-000000000007',2,'10:00','12:00','Software Engineering','I-202','Lecture'),('00000000-0000-4000-8000-000000000007',3,'09:00','11:00','Office hours','I-106','Free'),('00000000-0000-4000-8000-000000000007',4,'13:00','15:00','Software Lab','Lab I-2','Lab'),('00000000-0000-4000-8000-000000000007',5,'10:00','12:00','Software Engineering','I-202','Lecture'),
('00000000-0000-4000-8000-000000000008',2,'09:00','11:00','Office hours','M-210','Free'),('00000000-0000-4000-8000-000000000008',3,'13:00','15:00','Mechanics Lab','Lab M-2','Lab'),('00000000-0000-4000-8000-000000000008',4,'10:00','12:00','Engineering Mechanics','M-104','Lecture'),('00000000-0000-4000-8000-000000000008',5,'09:00','11:00','Office hours','M-210','Free'),
('00000000-0000-4000-8000-000000000009',2,'13:00','15:00','AI Lab','Lab C-4','Lab'),('00000000-0000-4000-8000-000000000009',3,'09:00','11:00','Artificial Intelligence','C-103','Lecture'),('00000000-0000-4000-8000-000000000009',4,'10:00','12:00','Office hours','C-308','Free'),('00000000-0000-4000-8000-000000000009',5,'13:00','14:00','Research meeting','C-308','Meeting'),
('00000000-0000-4000-8000-000000000010',2,'09:00','11:00','Office hours','I-108','Free'),('00000000-0000-4000-8000-000000000010',3,'13:00','15:00','Web Lab','Lab I-3','Lab'),('00000000-0000-4000-8000-000000000010',4,'10:00','12:00','Web Technology','I-201','Lecture'),('00000000-0000-4000-8000-000000000010',5,'09:00','11:00','Office hours','I-108','Free');