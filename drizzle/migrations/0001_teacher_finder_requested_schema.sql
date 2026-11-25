ALTER TABLE public.teachers ADD COLUMN department text NOT NULL DEFAULT '', ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
UPDATE public.teachers t SET department=d.name FROM public.departments d WHERE t.department_id=d.id;
CREATE FUNCTION public.sync_teacher_department() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE dept_id text; dept_name text;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.department_id IS DISTINCT FROM OLD.department_id AND NEW.department IS NOT DISTINCT FROM OLD.department THEN
   SELECT name INTO NEW.department FROM public.departments WHERE id=NEW.department_id;
   RETURN NEW;
  END IF;
 END IF;
 IF NEW.department IS NULL OR btrim(NEW.department)='' THEN
  SELECT name INTO NEW.department FROM public.departments WHERE id=NEW.department_id;
 ELSE
  SELECT id,name INTO dept_id,dept_name FROM public.departments WHERE name=NEW.department OR id=NEW.department ORDER BY (name=NEW.department) DESC LIMIT 1;
  IF dept_id IS NULL THEN
   INSERT INTO public.departments(id,name) VALUES (NEW.department,NEW.department);
   dept_id:=NEW.department; dept_name:=NEW.department;
  END IF;
  NEW.department_id:=dept_id; NEW.department:=dept_name;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER teacher_department_sync BEFORE INSERT OR UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.sync_teacher_department();
CREATE FUNCTION public.sync_department_name() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN UPDATE public.teachers SET department=NEW.name WHERE department_id=NEW.id; RETURN NEW; END $$;
CREATE TRIGGER department_name_sync AFTER UPDATE OF name ON public.departments FOR EACH ROW EXECUTE FUNCTION public.sync_department_name();
CREATE TABLE public.timetable (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
 day_of_week text NOT NULL,
 start_time time NOT NULL,
 end_time time NOT NULL,
 activity text NOT NULL,
 location text DEFAULT '',
 type text DEFAULT 'Lecture',
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT timetable_weekday CHECK(day_of_week IN ('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
 CONSTRAINT timetable_time_order CHECK(start_time<end_time),
 CONSTRAINT timetable_activity_type CHECK(type IN ('Lecture','Lab','Meeting','Free'))
);
GRANT SELECT ON public.timetable TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.timetable TO authenticated;
GRANT ALL ON public.timetable TO service_role;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_timetable ON public.timetable FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY admin_timetable ON public.timetable FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE INDEX timetable_teacher_day ON public.timetable(teacher_id,day_of_week);
INSERT INTO public.timetable(id,teacher_id,day_of_week,start_time,end_time,activity,location,type)
SELECT id,teacher_id,(ARRAY['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[day_of_week+1],start_time,end_time,activity,location,type FROM public.schedule_entries;
CREATE FUNCTION public.validate_timetable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.teacher_id::text,0));
 IF EXISTS(SELECT 1 FROM public.timetable WHERE teacher_id=NEW.teacher_id AND day_of_week=NEW.day_of_week AND id<>NEW.id AND start_time<NEW.end_time AND end_time>NEW.start_time) THEN RAISE EXCEPTION 'This time overlaps another timetable entry.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER no_timetable_overlap BEFORE INSERT OR UPDATE ON public.timetable FOR EACH ROW EXECUTE FUNCTION public.validate_timetable();
CREATE TRIGGER timetable_updated AFTER INSERT OR UPDATE OR DELETE ON public.timetable FOR EACH ROW EXECUTE FUNCTION public.touch_schedule_update();
COMMENT ON TABLE public.schedule_entries IS 'DEPRECATED: replaced by public.timetable; preserved for historical compatibility, no longer read or written by the application.';
COMMENT ON COLUMN public.teachers.department_id IS 'Compatibility department code for existing UI; synchronized with department by trigger.';