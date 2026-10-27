--
-- PostgreSQL database dump
--

\restrict OjHgG2SkMZvw4iTOk5kexsdqrmuahQt7KQqdsJ1V1IWDC6Q1K2wVPjdhdwij4CP

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_applications_ai_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_applications_ai_status AS ENUM (
    'pending',
    'done',
    'error'
);


--
-- Name: enum_applications_initial_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_applications_initial_result AS ENUM (
    'pending',
    'passed',
    'failed'
);


--
-- Name: enum_applications_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_applications_stage AS ENUM (
    'screening',
    'ai_error',
    'not_shortlisted',
    'invited_to_schedule',
    'initial_scheduled',
    'initial_failed',
    'initial_passed',
    'assessment_scheduled',
    'assessment_in_progress',
    'assessment_submitted',
    'assessment_failed',
    'assessment_passed',
    'final_scheduled'
);


--
-- Name: enum_applications_technical_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_applications_technical_result AS ENUM (
    'pending',
    'passed',
    'failed'
);


--
-- Name: enum_assessments_ended_by; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_assessments_ended_by AS ENUM (
    'submitted',
    'time_expired'
);


--
-- Name: enum_assessments_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_assessments_result AS ENUM (
    'pending',
    'passed',
    'failed'
);


--
-- Name: enum_assessments_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_assessments_status AS ENUM (
    'invited',
    'in_progress',
    'completed'
);


--
-- Name: enum_jobs_department; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jobs_department AS ENUM (
    'design',
    'engage',
    'plus',
    'advise'
);


--
-- Name: enum_jobs_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jobs_status AS ENUM (
    'open',
    'closed'
);


--
-- Name: enum_pages_blocks_content_stats_background; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_pages_blocks_content_stats_background AS ENUM (
    'default',
    'surface'
);


--
-- Name: enum_pages_blocks_features_background; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_pages_blocks_features_background AS ENUM (
    'default',
    'surface'
);


--
-- Name: enum_pages_blocks_hero_buttons_style; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_pages_blocks_hero_buttons_style AS ENUM (
    'primary',
    'outline'
);


--
-- Name: enum_pages_blocks_latest_posts_background; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_pages_blocks_latest_posts_background AS ENUM (
    'default',
    'surface'
);


--
-- Name: enum_proctoring_events_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_proctoring_events_type AS ENUM (
    'started',
    'resumed',
    'left_tab',
    'lost_focus',
    'fullscreen_exit',
    'paste',
    'camera_off',
    'screen_share_stopped',
    'multiple_monitors',
    'code_run',
    'time_expired',
    'submitted'
);


--
-- Name: enum_proctoring_recordings_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_proctoring_recordings_source AS ENUM (
    'webcam',
    'screen'
);


--
-- Name: enum_site_settings_theme_body_font; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_site_settings_theme_body_font AS ENUM (
    'saans',
    'inter',
    'roboto',
    'open-sans',
    'lato',
    'montserrat',
    'poppins',
    'dm-sans',
    'space-grotesk',
    'playfair-display',
    'merriweather',
    'lora',
    'source-serif-4',
    'system'
);


--
-- Name: enum_site_settings_theme_heading_font; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_site_settings_theme_heading_font AS ENUM (
    'saans',
    'inter',
    'roboto',
    'open-sans',
    'lato',
    'montserrat',
    'poppins',
    'dm-sans',
    'space-grotesk',
    'playfair-display',
    'merriweather',
    'lora',
    'source-serif-4',
    'system'
);


--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'head_of_plus'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applicants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applicants (
    id integer NOT NULL,
    name character varying,
    time_limit_minutes numeric DEFAULT 30 NOT NULL,
    password_set boolean DEFAULT false,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    email character varying NOT NULL,
    reset_password_token character varying,
    reset_password_expiration timestamp(3) with time zone,
    salt character varying,
    hash character varying,
    reset_password_requested_at timestamp(3) with time zone,
    login_attempts numeric DEFAULT 0,
    lock_until timestamp(3) with time zone
);


--
-- Name: applicants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.applicants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: applicants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.applicants_id_seq OWNED BY public.applicants.id;


--
-- Name: applicants_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applicants_sessions (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    created_at timestamp(3) with time zone,
    expires_at timestamp(3) with time zone NOT NULL
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id integer NOT NULL,
    email character varying NOT NULL,
    name character varying,
    job_id integer NOT NULL,
    resume_id integer,
    ai_score numeric,
    shortlisted boolean,
    ai_summary character varying,
    ai_strengths character varying,
    ai_gaps character varying,
    ai_error character varying,
    initial_interview_at timestamp(3) with time zone,
    initial_interview_link character varying,
    initial_interview_slot_id integer,
    initial_result public.enum_applications_initial_result DEFAULT 'pending'::public.enum_applications_initial_result,
    initial_notes character varying,
    technical_assessment_at timestamp(3) with time zone,
    assessment_id integer,
    technical_result public.enum_applications_technical_result DEFAULT 'pending'::public.enum_applications_technical_result,
    final_interview_at timestamp(3) with time zone,
    final_interview_details character varying,
    stage public.enum_applications_stage,
    applicant_id integer,
    ai_status public.enum_applications_ai_status DEFAULT 'pending'::public.enum_applications_ai_status,
    ai_reviewed_at timestamp(3) with time zone,
    assessment_status character varying,
    scheduling_token character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id integer NOT NULL,
    candidate_name character varying NOT NULL,
    candidate_email character varying NOT NULL,
    task jsonb,
    duration_minutes numeric DEFAULT 30 NOT NULL,
    available_from timestamp(3) with time zone,
    expires_at timestamp(3) with time zone,
    require_webcam boolean DEFAULT true,
    record_screen boolean DEFAULT true,
    language_label character varying,
    language_id numeric,
    code character varying,
    final_run_status character varying,
    final_run_time character varying,
    final_run_memory numeric,
    final_run_stdin character varying,
    final_run_stdout character varying,
    final_run_errors character varying,
    feedback character varying,
    result public.enum_assessments_result DEFAULT 'pending'::public.enum_assessments_result NOT NULL,
    applicant_id integer,
    applicant_password character varying,
    status public.enum_assessments_status DEFAULT 'invited'::public.enum_assessments_status NOT NULL,
    token character varying,
    started_at timestamp(3) with time zone,
    completed_at timestamp(3) with time zone,
    ended_by public.enum_assessments_ended_by,
    submitted_late boolean,
    tab_switches numeric DEFAULT 0,
    time_away_seconds numeric DEFAULT 0,
    fullscreen_exits numeric DEFAULT 0,
    pastes numeric DEFAULT 0,
    pasted_characters numeric DEFAULT 0,
    code_runs numeric DEFAULT 0,
    multiple_monitors boolean,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessments_id_seq OWNED BY public.assessments.id;


--
-- Name: footer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.footer (
    id integer NOT NULL,
    copyright character varying,
    updated_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone
);


--
-- Name: footer_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.footer_columns (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    heading character varying
);


--
-- Name: footer_columns_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.footer_columns_links (
    _order integer NOT NULL,
    _parent_id character varying NOT NULL,
    id character varying NOT NULL,
    label character varying NOT NULL,
    url character varying NOT NULL,
    new_tab boolean DEFAULT false
);


--
-- Name: footer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.footer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: footer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.footer_id_seq OWNED BY public.footer.id;


--
-- Name: header; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.header (
    id integer NOT NULL,
    main_website_url character varying,
    updated_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone
);


--
-- Name: header_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.header_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: header_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.header_id_seq OWNED BY public.header.id;


--
-- Name: header_nav_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.header_nav_items (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    label character varying NOT NULL,
    url character varying NOT NULL,
    new_tab boolean DEFAULT false
);


--
-- Name: header_nav_items_children; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.header_nav_items_children (
    _order integer NOT NULL,
    _parent_id character varying NOT NULL,
    id character varying NOT NULL,
    label character varying NOT NULL,
    url character varying NOT NULL,
    new_tab boolean DEFAULT false
);


--
-- Name: interview_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_slots (
    id integer NOT NULL,
    starts_at timestamp(3) with time zone NOT NULL,
    duration_minutes numeric DEFAULT 30 NOT NULL,
    interviewer_id integer,
    meeting_link character varying,
    application_id integer,
    label character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: interview_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interview_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interview_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interview_slots_id_seq OWNED BY public.interview_slots.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying,
    status public.enum_jobs_status DEFAULT 'open'::public.enum_jobs_status NOT NULL,
    department public.enum_jobs_department DEFAULT 'design'::public.enum_jobs_department NOT NULL,
    location character varying,
    employment_type character varying,
    summary character varying,
    qualifications jsonb NOT NULL,
    minimum_score numeric DEFAULT 80 NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: jobs_required_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs_required_skills (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    skill character varying NOT NULL
);


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id integer NOT NULL,
    alt character varying NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    url character varying,
    thumbnail_u_r_l character varying,
    filename character varying,
    mime_type character varying,
    filesize numeric,
    width numeric,
    height numeric,
    focal_x numeric,
    focal_y numeric
);


--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: pages_blocks_careers_hero; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_careers_hero (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    heading character varying DEFAULT 'Join the Team'::character varying NOT NULL,
    description character varying DEFAULT 'If you bring quality, drive, and genuine team spirit, you will fit right in at Wellevate.'::character varying,
    block_name character varying
);


--
-- Name: pages_blocks_content_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_content_stats (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    eyebrow character varying,
    heading character varying NOT NULL,
    body character varying,
    note character varying,
    background public.enum_pages_blocks_content_stats_background DEFAULT 'default'::public.enum_pages_blocks_content_stats_background,
    block_name character varying
);


--
-- Name: pages_blocks_content_stats_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_content_stats_stats (
    _order integer NOT NULL,
    _parent_id character varying NOT NULL,
    id character varying NOT NULL,
    value character varying NOT NULL,
    label character varying NOT NULL
);


--
-- Name: pages_blocks_cta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_cta (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    heading character varying NOT NULL,
    body character varying,
    button_label character varying,
    button_url character varying,
    button_new_tab boolean DEFAULT false,
    block_name character varying
);


--
-- Name: pages_blocks_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_features (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    eyebrow character varying,
    heading character varying NOT NULL,
    subheading character varying,
    background public.enum_pages_blocks_features_background DEFAULT 'surface'::public.enum_pages_blocks_features_background,
    block_name character varying
);


--
-- Name: pages_blocks_features_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_features_items (
    _order integer NOT NULL,
    _parent_id character varying NOT NULL,
    id character varying NOT NULL,
    title character varying NOT NULL,
    body character varying
);


--
-- Name: pages_blocks_hero; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_hero (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    eyebrow character varying,
    heading character varying NOT NULL,
    lead character varying,
    block_name character varying
);


--
-- Name: pages_blocks_hero_buttons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_hero_buttons (
    _order integer NOT NULL,
    _parent_id character varying NOT NULL,
    id character varying NOT NULL,
    label character varying NOT NULL,
    url character varying NOT NULL,
    new_tab boolean DEFAULT false,
    style public.enum_pages_blocks_hero_buttons_style DEFAULT 'primary'::public.enum_pages_blocks_hero_buttons_style
);


--
-- Name: pages_blocks_job_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_job_listings (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    heading character varying DEFAULT 'Open Positions'::character varying,
    subheading character varying,
    block_name character varying
);


--
-- Name: pages_blocks_latest_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_blocks_latest_posts (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    eyebrow character varying,
    heading character varying NOT NULL,
    subheading character varying,
    "limit" numeric DEFAULT 3 NOT NULL,
    show_view_all boolean DEFAULT true,
    background public.enum_pages_blocks_latest_posts_background DEFAULT 'default'::public.enum_pages_blocks_latest_posts_background,
    block_name character varying
);


--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;


--
-- Name: payload_kv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_kv (
    id integer NOT NULL,
    key character varying NOT NULL,
    data jsonb NOT NULL
);


--
-- Name: payload_kv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_kv_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_kv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_kv_id_seq OWNED BY public.payload_kv.id;


--
-- Name: payload_locked_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_locked_documents (
    id integer NOT NULL,
    global_slug character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: payload_locked_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_locked_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_locked_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_locked_documents_id_seq OWNED BY public.payload_locked_documents.id;


--
-- Name: payload_locked_documents_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_locked_documents_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    pages_id integer,
    posts_id integer,
    users_id integer,
    media_id integer,
    applicants_id integer,
    assessments_id integer,
    proctoring_events_id integer,
    proctoring_recordings_id integer,
    proctoring_snapshots_id integer,
    jobs_id integer,
    applications_id integer,
    interview_slots_id integer,
    resumes_id integer
);


--
-- Name: payload_locked_documents_rels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_locked_documents_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_locked_documents_rels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_locked_documents_rels_id_seq OWNED BY public.payload_locked_documents_rels.id;


--
-- Name: payload_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_migrations (
    id integer NOT NULL,
    name character varying,
    batch numeric,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: payload_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_migrations_id_seq OWNED BY public.payload_migrations.id;


--
-- Name: payload_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_preferences (
    id integer NOT NULL,
    key character varying,
    value jsonb,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: payload_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_preferences_id_seq OWNED BY public.payload_preferences.id;


--
-- Name: payload_preferences_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_preferences_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    users_id integer,
    applicants_id integer
);


--
-- Name: payload_preferences_rels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_preferences_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_preferences_rels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_preferences_rels_id_seq OWNED BY public.payload_preferences_rels.id;


--
-- Name: playground; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playground (
    id integer NOT NULL,
    heading character varying DEFAULT 'Instructions'::character varying NOT NULL,
    instructions jsonb,
    updated_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone
);


--
-- Name: playground_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playground_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playground_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playground_id_seq OWNED BY public.playground.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    title character varying NOT NULL,
    excerpt character varying,
    cover_image_id integer,
    content jsonb NOT NULL,
    slug character varying NOT NULL,
    published_at timestamp(3) with time zone NOT NULL,
    category character varying,
    author_name character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: proctoring_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proctoring_events (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    type public.enum_proctoring_events_type NOT NULL,
    at timestamp(3) with time zone NOT NULL,
    duration_seconds numeric,
    characters numeric,
    detail character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: proctoring_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proctoring_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proctoring_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proctoring_events_id_seq OWNED BY public.proctoring_events.id;


--
-- Name: proctoring_recordings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proctoring_recordings (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    source public.enum_proctoring_recordings_source,
    started_at timestamp(3) with time zone NOT NULL,
    ended_at timestamp(3) with time zone NOT NULL,
    duration_seconds numeric,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    url character varying,
    thumbnail_u_r_l character varying,
    filename character varying,
    mime_type character varying,
    filesize numeric,
    width numeric,
    height numeric,
    focal_x numeric,
    focal_y numeric
);


--
-- Name: proctoring_recordings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proctoring_recordings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proctoring_recordings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proctoring_recordings_id_seq OWNED BY public.proctoring_recordings.id;


--
-- Name: proctoring_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proctoring_snapshots (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    taken_at timestamp(3) with time zone NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    url character varying,
    thumbnail_u_r_l character varying,
    filename character varying,
    mime_type character varying,
    filesize numeric,
    width numeric,
    height numeric,
    focal_x numeric,
    focal_y numeric
);


--
-- Name: proctoring_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proctoring_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proctoring_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proctoring_snapshots_id_seq OWNED BY public.proctoring_snapshots.id;


--
-- Name: resumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resumes (
    id integer NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    url character varying,
    thumbnail_u_r_l character varying,
    filename character varying,
    mime_type character varying,
    filesize numeric,
    width numeric,
    height numeric,
    focal_x numeric,
    focal_y numeric
);


--
-- Name: resumes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resumes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: resumes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resumes_id_seq OWNED BY public.resumes.id;


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id integer NOT NULL,
    site_name character varying NOT NULL,
    tagline character varying,
    logo_id integer,
    favicon_id integer,
    theme_heading_font public.enum_site_settings_theme_heading_font DEFAULT 'saans'::public.enum_site_settings_theme_heading_font,
    theme_body_font public.enum_site_settings_theme_body_font DEFAULT 'saans'::public.enum_site_settings_theme_body_font,
    theme_heading_color character varying DEFAULT '#111827'::character varying,
    theme_paragraph_color character varying DEFAULT '#374151'::character varying,
    theme_sub_paragraph_color character varying DEFAULT '#6b7280'::character varying,
    theme_primary_color character varying DEFAULT '#4f46e5'::character varying,
    theme_background_color character varying DEFAULT '#ffffff'::character varying,
    theme_surface_color character varying DEFAULT '#f5f5f7'::character varying,
    updated_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone
);


--
-- Name: site_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.site_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: site_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.site_settings_id_seq OWNED BY public.site_settings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying,
    role public.enum_users_role DEFAULT 'admin'::public.enum_users_role,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    email character varying NOT NULL,
    reset_password_token character varying,
    reset_password_expiration timestamp(3) with time zone,
    salt character varying,
    hash character varying,
    reset_password_requested_at timestamp(3) with time zone,
    login_attempts numeric DEFAULT 0,
    lock_until timestamp(3) with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_sessions (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    created_at timestamp(3) with time zone,
    expires_at timestamp(3) with time zone NOT NULL
);


--
-- Name: applicants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicants ALTER COLUMN id SET DEFAULT nextval('public.applicants_id_seq'::regclass);


--
-- Name: applications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);


--
-- Name: assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments ALTER COLUMN id SET DEFAULT nextval('public.assessments_id_seq'::regclass);


--
-- Name: footer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer ALTER COLUMN id SET DEFAULT nextval('public.footer_id_seq'::regclass);


--
-- Name: header id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.header ALTER COLUMN id SET DEFAULT nextval('public.header_id_seq'::regclass);


--
-- Name: interview_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_slots ALTER COLUMN id SET DEFAULT nextval('public.interview_slots_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: pages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages ALTER COLUMN id SET DEFAULT nextval('public.pages_id_seq'::regclass);


--
-- Name: payload_kv id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_kv ALTER COLUMN id SET DEFAULT nextval('public.payload_kv_id_seq'::regclass);


--
-- Name: payload_locked_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents ALTER COLUMN id SET DEFAULT nextval('public.payload_locked_documents_id_seq'::regclass);


--
-- Name: payload_locked_documents_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels ALTER COLUMN id SET DEFAULT nextval('public.payload_locked_documents_rels_id_seq'::regclass);


--
-- Name: payload_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_migrations ALTER COLUMN id SET DEFAULT nextval('public.payload_migrations_id_seq'::regclass);


--
-- Name: payload_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences ALTER COLUMN id SET DEFAULT nextval('public.payload_preferences_id_seq'::regclass);


--
-- Name: payload_preferences_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels ALTER COLUMN id SET DEFAULT nextval('public.payload_preferences_rels_id_seq'::regclass);


--
-- Name: playground id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playground ALTER COLUMN id SET DEFAULT nextval('public.playground_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: proctoring_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_events ALTER COLUMN id SET DEFAULT nextval('public.proctoring_events_id_seq'::regclass);


--
-- Name: proctoring_recordings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_recordings ALTER COLUMN id SET DEFAULT nextval('public.proctoring_recordings_id_seq'::regclass);


--
-- Name: proctoring_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_snapshots ALTER COLUMN id SET DEFAULT nextval('public.proctoring_snapshots_id_seq'::regclass);


--
-- Name: resumes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes ALTER COLUMN id SET DEFAULT nextval('public.resumes_id_seq'::regclass);


--
-- Name: site_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings ALTER COLUMN id SET DEFAULT nextval('public.site_settings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: applicants applicants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicants
    ADD CONSTRAINT applicants_pkey PRIMARY KEY (id);


--
-- Name: applicants_sessions applicants_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicants_sessions
    ADD CONSTRAINT applicants_sessions_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: footer_columns_links footer_columns_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer_columns_links
    ADD CONSTRAINT footer_columns_links_pkey PRIMARY KEY (id);


--
-- Name: footer_columns footer_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer_columns
    ADD CONSTRAINT footer_columns_pkey PRIMARY KEY (id);


--
-- Name: footer footer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer
    ADD CONSTRAINT footer_pkey PRIMARY KEY (id);


--
-- Name: header_nav_items_children header_nav_items_children_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.header_nav_items_children
    ADD CONSTRAINT header_nav_items_children_pkey PRIMARY KEY (id);


--
-- Name: header_nav_items header_nav_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.header_nav_items
    ADD CONSTRAINT header_nav_items_pkey PRIMARY KEY (id);


--
-- Name: header header_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.header
    ADD CONSTRAINT header_pkey PRIMARY KEY (id);


--
-- Name: interview_slots interview_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_slots
    ADD CONSTRAINT interview_slots_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: jobs_required_skills jobs_required_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs_required_skills
    ADD CONSTRAINT jobs_required_skills_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_careers_hero pages_blocks_careers_hero_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_careers_hero
    ADD CONSTRAINT pages_blocks_careers_hero_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_content_stats pages_blocks_content_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_content_stats
    ADD CONSTRAINT pages_blocks_content_stats_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_content_stats_stats pages_blocks_content_stats_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_content_stats_stats
    ADD CONSTRAINT pages_blocks_content_stats_stats_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_cta pages_blocks_cta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_cta
    ADD CONSTRAINT pages_blocks_cta_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_features_items pages_blocks_features_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_features_items
    ADD CONSTRAINT pages_blocks_features_items_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_features pages_blocks_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_features
    ADD CONSTRAINT pages_blocks_features_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_hero_buttons pages_blocks_hero_buttons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_hero_buttons
    ADD CONSTRAINT pages_blocks_hero_buttons_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_hero pages_blocks_hero_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_hero
    ADD CONSTRAINT pages_blocks_hero_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_job_listings pages_blocks_job_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_job_listings
    ADD CONSTRAINT pages_blocks_job_listings_pkey PRIMARY KEY (id);


--
-- Name: pages_blocks_latest_posts pages_blocks_latest_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_latest_posts
    ADD CONSTRAINT pages_blocks_latest_posts_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: payload_kv payload_kv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_kv
    ADD CONSTRAINT payload_kv_pkey PRIMARY KEY (id);


--
-- Name: payload_locked_documents payload_locked_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents
    ADD CONSTRAINT payload_locked_documents_pkey PRIMARY KEY (id);


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_pkey PRIMARY KEY (id);


--
-- Name: payload_migrations payload_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_migrations
    ADD CONSTRAINT payload_migrations_pkey PRIMARY KEY (id);


--
-- Name: payload_preferences payload_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences
    ADD CONSTRAINT payload_preferences_pkey PRIMARY KEY (id);


--
-- Name: payload_preferences_rels payload_preferences_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_pkey PRIMARY KEY (id);


--
-- Name: playground playground_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playground
    ADD CONSTRAINT playground_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: proctoring_events proctoring_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_events
    ADD CONSTRAINT proctoring_events_pkey PRIMARY KEY (id);


--
-- Name: proctoring_recordings proctoring_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_recordings
    ADD CONSTRAINT proctoring_recordings_pkey PRIMARY KEY (id);


--
-- Name: proctoring_snapshots proctoring_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_snapshots
    ADD CONSTRAINT proctoring_snapshots_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_sessions users_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_sessions
    ADD CONSTRAINT users_sessions_pkey PRIMARY KEY (id);


--
-- Name: applicants_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applicants_created_at_idx ON public.applicants USING btree (created_at);


--
-- Name: applicants_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX applicants_email_idx ON public.applicants USING btree (email);


--
-- Name: applicants_sessions_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applicants_sessions_order_idx ON public.applicants_sessions USING btree (_order);


--
-- Name: applicants_sessions_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applicants_sessions_parent_id_idx ON public.applicants_sessions USING btree (_parent_id);


--
-- Name: applicants_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applicants_updated_at_idx ON public.applicants USING btree (updated_at);


--
-- Name: applications_applicant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_applicant_idx ON public.applications USING btree (applicant_id);


--
-- Name: applications_assessment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_assessment_idx ON public.applications USING btree (assessment_id);


--
-- Name: applications_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_created_at_idx ON public.applications USING btree (created_at);


--
-- Name: applications_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_email_idx ON public.applications USING btree (email);


--
-- Name: applications_initial_interview_slot_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_initial_interview_slot_idx ON public.applications USING btree (initial_interview_slot_id);


--
-- Name: applications_job_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_job_idx ON public.applications USING btree (job_id);


--
-- Name: applications_resume_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_resume_idx ON public.applications USING btree (resume_id);


--
-- Name: applications_scheduling_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX applications_scheduling_token_idx ON public.applications USING btree (scheduling_token);


--
-- Name: applications_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_stage_idx ON public.applications USING btree (stage);


--
-- Name: applications_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_updated_at_idx ON public.applications USING btree (updated_at);


--
-- Name: assessments_applicant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assessments_applicant_idx ON public.assessments USING btree (applicant_id);


--
-- Name: assessments_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assessments_created_at_idx ON public.assessments USING btree (created_at);


--
-- Name: assessments_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX assessments_token_idx ON public.assessments USING btree (token);


--
-- Name: assessments_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assessments_updated_at_idx ON public.assessments USING btree (updated_at);


--
-- Name: footer_columns_links_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX footer_columns_links_order_idx ON public.footer_columns_links USING btree (_order);


--
-- Name: footer_columns_links_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX footer_columns_links_parent_id_idx ON public.footer_columns_links USING btree (_parent_id);


--
-- Name: footer_columns_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX footer_columns_order_idx ON public.footer_columns USING btree (_order);


--
-- Name: footer_columns_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX footer_columns_parent_id_idx ON public.footer_columns USING btree (_parent_id);


--
-- Name: header_nav_items_children_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX header_nav_items_children_order_idx ON public.header_nav_items_children USING btree (_order);


--
-- Name: header_nav_items_children_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX header_nav_items_children_parent_id_idx ON public.header_nav_items_children USING btree (_parent_id);


--
-- Name: header_nav_items_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX header_nav_items_order_idx ON public.header_nav_items USING btree (_order);


--
-- Name: header_nav_items_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX header_nav_items_parent_id_idx ON public.header_nav_items USING btree (_parent_id);


--
-- Name: interview_slots_application_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interview_slots_application_idx ON public.interview_slots USING btree (application_id);


--
-- Name: interview_slots_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interview_slots_created_at_idx ON public.interview_slots USING btree (created_at);


--
-- Name: interview_slots_interviewer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interview_slots_interviewer_idx ON public.interview_slots USING btree (interviewer_id);


--
-- Name: interview_slots_starts_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interview_slots_starts_at_idx ON public.interview_slots USING btree (starts_at);


--
-- Name: interview_slots_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interview_slots_updated_at_idx ON public.interview_slots USING btree (updated_at);


--
-- Name: jobs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_created_at_idx ON public.jobs USING btree (created_at);


--
-- Name: jobs_required_skills_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_required_skills_order_idx ON public.jobs_required_skills USING btree (_order);


--
-- Name: jobs_required_skills_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_required_skills_parent_id_idx ON public.jobs_required_skills USING btree (_parent_id);


--
-- Name: jobs_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX jobs_slug_idx ON public.jobs USING btree (slug);


--
-- Name: jobs_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_updated_at_idx ON public.jobs USING btree (updated_at);


--
-- Name: media_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_created_at_idx ON public.media USING btree (created_at);


--
-- Name: media_filename_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX media_filename_idx ON public.media USING btree (filename);


--
-- Name: media_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_updated_at_idx ON public.media USING btree (updated_at);


--
-- Name: pages_blocks_careers_hero_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_careers_hero_order_idx ON public.pages_blocks_careers_hero USING btree (_order);


--
-- Name: pages_blocks_careers_hero_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_careers_hero_parent_id_idx ON public.pages_blocks_careers_hero USING btree (_parent_id);


--
-- Name: pages_blocks_careers_hero_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_careers_hero_path_idx ON public.pages_blocks_careers_hero USING btree (_path);


--
-- Name: pages_blocks_content_stats_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_content_stats_order_idx ON public.pages_blocks_content_stats USING btree (_order);


--
-- Name: pages_blocks_content_stats_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_content_stats_parent_id_idx ON public.pages_blocks_content_stats USING btree (_parent_id);


--
-- Name: pages_blocks_content_stats_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_content_stats_path_idx ON public.pages_blocks_content_stats USING btree (_path);


--
-- Name: pages_blocks_content_stats_stats_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_content_stats_stats_order_idx ON public.pages_blocks_content_stats_stats USING btree (_order);


--
-- Name: pages_blocks_content_stats_stats_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_content_stats_stats_parent_id_idx ON public.pages_blocks_content_stats_stats USING btree (_parent_id);


--
-- Name: pages_blocks_cta_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_cta_order_idx ON public.pages_blocks_cta USING btree (_order);


--
-- Name: pages_blocks_cta_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_cta_parent_id_idx ON public.pages_blocks_cta USING btree (_parent_id);


--
-- Name: pages_blocks_cta_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_cta_path_idx ON public.pages_blocks_cta USING btree (_path);


--
-- Name: pages_blocks_features_items_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_features_items_order_idx ON public.pages_blocks_features_items USING btree (_order);


--
-- Name: pages_blocks_features_items_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_features_items_parent_id_idx ON public.pages_blocks_features_items USING btree (_parent_id);


--
-- Name: pages_blocks_features_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_features_order_idx ON public.pages_blocks_features USING btree (_order);


--
-- Name: pages_blocks_features_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_features_parent_id_idx ON public.pages_blocks_features USING btree (_parent_id);


--
-- Name: pages_blocks_features_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_features_path_idx ON public.pages_blocks_features USING btree (_path);


--
-- Name: pages_blocks_hero_buttons_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_hero_buttons_order_idx ON public.pages_blocks_hero_buttons USING btree (_order);


--
-- Name: pages_blocks_hero_buttons_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_hero_buttons_parent_id_idx ON public.pages_blocks_hero_buttons USING btree (_parent_id);


--
-- Name: pages_blocks_hero_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_hero_order_idx ON public.pages_blocks_hero USING btree (_order);


--
-- Name: pages_blocks_hero_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_hero_parent_id_idx ON public.pages_blocks_hero USING btree (_parent_id);


--
-- Name: pages_blocks_hero_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_hero_path_idx ON public.pages_blocks_hero USING btree (_path);


--
-- Name: pages_blocks_job_listings_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_job_listings_order_idx ON public.pages_blocks_job_listings USING btree (_order);


--
-- Name: pages_blocks_job_listings_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_job_listings_parent_id_idx ON public.pages_blocks_job_listings USING btree (_parent_id);


--
-- Name: pages_blocks_job_listings_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_job_listings_path_idx ON public.pages_blocks_job_listings USING btree (_path);


--
-- Name: pages_blocks_latest_posts_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_latest_posts_order_idx ON public.pages_blocks_latest_posts USING btree (_order);


--
-- Name: pages_blocks_latest_posts_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_latest_posts_parent_id_idx ON public.pages_blocks_latest_posts USING btree (_parent_id);


--
-- Name: pages_blocks_latest_posts_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_blocks_latest_posts_path_idx ON public.pages_blocks_latest_posts USING btree (_path);


--
-- Name: pages_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_created_at_idx ON public.pages USING btree (created_at);


--
-- Name: pages_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pages_slug_idx ON public.pages USING btree (slug);


--
-- Name: pages_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_updated_at_idx ON public.pages USING btree (updated_at);


--
-- Name: payload_kv_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payload_kv_key_idx ON public.payload_kv USING btree (key);


--
-- Name: payload_locked_documents_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_created_at_idx ON public.payload_locked_documents USING btree (created_at);


--
-- Name: payload_locked_documents_global_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_global_slug_idx ON public.payload_locked_documents USING btree (global_slug);


--
-- Name: payload_locked_documents_rels_applicants_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_applicants_id_idx ON public.payload_locked_documents_rels USING btree (applicants_id);


--
-- Name: payload_locked_documents_rels_applications_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_applications_id_idx ON public.payload_locked_documents_rels USING btree (applications_id);


--
-- Name: payload_locked_documents_rels_assessments_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_assessments_id_idx ON public.payload_locked_documents_rels USING btree (assessments_id);


--
-- Name: payload_locked_documents_rels_interview_slots_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_interview_slots_id_idx ON public.payload_locked_documents_rels USING btree (interview_slots_id);


--
-- Name: payload_locked_documents_rels_jobs_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_jobs_id_idx ON public.payload_locked_documents_rels USING btree (jobs_id);


--
-- Name: payload_locked_documents_rels_media_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_media_id_idx ON public.payload_locked_documents_rels USING btree (media_id);


--
-- Name: payload_locked_documents_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_order_idx ON public.payload_locked_documents_rels USING btree ("order");


--
-- Name: payload_locked_documents_rels_pages_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_pages_id_idx ON public.payload_locked_documents_rels USING btree (pages_id);


--
-- Name: payload_locked_documents_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_parent_idx ON public.payload_locked_documents_rels USING btree (parent_id);


--
-- Name: payload_locked_documents_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_path_idx ON public.payload_locked_documents_rels USING btree (path);


--
-- Name: payload_locked_documents_rels_posts_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_posts_id_idx ON public.payload_locked_documents_rels USING btree (posts_id);


--
-- Name: payload_locked_documents_rels_proctoring_events_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_proctoring_events_id_idx ON public.payload_locked_documents_rels USING btree (proctoring_events_id);


--
-- Name: payload_locked_documents_rels_proctoring_recordings_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_proctoring_recordings_id_idx ON public.payload_locked_documents_rels USING btree (proctoring_recordings_id);


--
-- Name: payload_locked_documents_rels_proctoring_snapshots_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_proctoring_snapshots_id_idx ON public.payload_locked_documents_rels USING btree (proctoring_snapshots_id);


--
-- Name: payload_locked_documents_rels_resumes_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_resumes_id_idx ON public.payload_locked_documents_rels USING btree (resumes_id);


--
-- Name: payload_locked_documents_rels_users_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_users_id_idx ON public.payload_locked_documents_rels USING btree (users_id);


--
-- Name: payload_locked_documents_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_updated_at_idx ON public.payload_locked_documents USING btree (updated_at);


--
-- Name: payload_migrations_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_migrations_created_at_idx ON public.payload_migrations USING btree (created_at);


--
-- Name: payload_migrations_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_migrations_updated_at_idx ON public.payload_migrations USING btree (updated_at);


--
-- Name: payload_preferences_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_created_at_idx ON public.payload_preferences USING btree (created_at);


--
-- Name: payload_preferences_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_key_idx ON public.payload_preferences USING btree (key);


--
-- Name: payload_preferences_rels_applicants_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_applicants_id_idx ON public.payload_preferences_rels USING btree (applicants_id);


--
-- Name: payload_preferences_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_order_idx ON public.payload_preferences_rels USING btree ("order");


--
-- Name: payload_preferences_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_parent_idx ON public.payload_preferences_rels USING btree (parent_id);


--
-- Name: payload_preferences_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_path_idx ON public.payload_preferences_rels USING btree (path);


--
-- Name: payload_preferences_rels_users_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_users_id_idx ON public.payload_preferences_rels USING btree (users_id);


--
-- Name: payload_preferences_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_updated_at_idx ON public.payload_preferences USING btree (updated_at);


--
-- Name: posts_cover_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_cover_image_idx ON public.posts USING btree (cover_image_id);


--
-- Name: posts_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at);


--
-- Name: posts_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX posts_slug_idx ON public.posts USING btree (slug);


--
-- Name: posts_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_updated_at_idx ON public.posts USING btree (updated_at);


--
-- Name: proctoring_events_assessment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_events_assessment_idx ON public.proctoring_events USING btree (assessment_id);


--
-- Name: proctoring_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_events_created_at_idx ON public.proctoring_events USING btree (created_at);


--
-- Name: proctoring_events_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_events_updated_at_idx ON public.proctoring_events USING btree (updated_at);


--
-- Name: proctoring_recordings_assessment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_recordings_assessment_idx ON public.proctoring_recordings USING btree (assessment_id);


--
-- Name: proctoring_recordings_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_recordings_created_at_idx ON public.proctoring_recordings USING btree (created_at);


--
-- Name: proctoring_recordings_filename_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX proctoring_recordings_filename_idx ON public.proctoring_recordings USING btree (filename);


--
-- Name: proctoring_recordings_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_recordings_started_at_idx ON public.proctoring_recordings USING btree (started_at);


--
-- Name: proctoring_recordings_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_recordings_updated_at_idx ON public.proctoring_recordings USING btree (updated_at);


--
-- Name: proctoring_snapshots_assessment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_snapshots_assessment_idx ON public.proctoring_snapshots USING btree (assessment_id);


--
-- Name: proctoring_snapshots_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_snapshots_created_at_idx ON public.proctoring_snapshots USING btree (created_at);


--
-- Name: proctoring_snapshots_filename_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX proctoring_snapshots_filename_idx ON public.proctoring_snapshots USING btree (filename);


--
-- Name: proctoring_snapshots_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_snapshots_taken_at_idx ON public.proctoring_snapshots USING btree (taken_at);


--
-- Name: proctoring_snapshots_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proctoring_snapshots_updated_at_idx ON public.proctoring_snapshots USING btree (updated_at);


--
-- Name: resumes_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resumes_created_at_idx ON public.resumes USING btree (created_at);


--
-- Name: resumes_filename_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX resumes_filename_idx ON public.resumes USING btree (filename);


--
-- Name: resumes_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resumes_updated_at_idx ON public.resumes USING btree (updated_at);


--
-- Name: site_settings_favicon_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX site_settings_favicon_idx ON public.site_settings USING btree (favicon_id);


--
-- Name: site_settings_logo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX site_settings_logo_idx ON public.site_settings USING btree (logo_id);


--
-- Name: users_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_created_at_idx ON public.users USING btree (created_at);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_sessions_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_sessions_order_idx ON public.users_sessions USING btree (_order);


--
-- Name: users_sessions_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_sessions_parent_id_idx ON public.users_sessions USING btree (_parent_id);


--
-- Name: users_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_updated_at_idx ON public.users USING btree (updated_at);


--
-- Name: applicants_sessions applicants_sessions_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applicants_sessions
    ADD CONSTRAINT applicants_sessions_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.applicants(id) ON DELETE CASCADE;


--
-- Name: applications applications_applicant_id_applicants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_applicant_id_applicants_id_fk FOREIGN KEY (applicant_id) REFERENCES public.applicants(id) ON DELETE SET NULL;


--
-- Name: applications applications_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: applications applications_initial_interview_slot_id_interview_slots_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_initial_interview_slot_id_interview_slots_id_fk FOREIGN KEY (initial_interview_slot_id) REFERENCES public.interview_slots(id) ON DELETE SET NULL;


--
-- Name: applications applications_job_id_jobs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_jobs_id_fk FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: applications applications_resume_id_resumes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_resume_id_resumes_id_fk FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;


--
-- Name: assessments assessments_applicant_id_applicants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_applicant_id_applicants_id_fk FOREIGN KEY (applicant_id) REFERENCES public.applicants(id) ON DELETE SET NULL;


--
-- Name: footer_columns_links footer_columns_links_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer_columns_links
    ADD CONSTRAINT footer_columns_links_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.footer_columns(id) ON DELETE CASCADE;


--
-- Name: footer_columns footer_columns_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer_columns
    ADD CONSTRAINT footer_columns_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.footer(id) ON DELETE CASCADE;


--
-- Name: header_nav_items_children header_nav_items_children_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.header_nav_items_children
    ADD CONSTRAINT header_nav_items_children_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.header_nav_items(id) ON DELETE CASCADE;


--
-- Name: header_nav_items header_nav_items_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.header_nav_items
    ADD CONSTRAINT header_nav_items_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.header(id) ON DELETE CASCADE;


--
-- Name: interview_slots interview_slots_application_id_applications_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_slots
    ADD CONSTRAINT interview_slots_application_id_applications_id_fk FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL;


--
-- Name: interview_slots interview_slots_interviewer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_slots
    ADD CONSTRAINT interview_slots_interviewer_id_users_id_fk FOREIGN KEY (interviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: jobs_required_skills jobs_required_skills_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs_required_skills
    ADD CONSTRAINT jobs_required_skills_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_careers_hero pages_blocks_careers_hero_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_careers_hero
    ADD CONSTRAINT pages_blocks_careers_hero_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_content_stats pages_blocks_content_stats_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_content_stats
    ADD CONSTRAINT pages_blocks_content_stats_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_content_stats_stats pages_blocks_content_stats_stats_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_content_stats_stats
    ADD CONSTRAINT pages_blocks_content_stats_stats_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages_blocks_content_stats(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_cta pages_blocks_cta_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_cta
    ADD CONSTRAINT pages_blocks_cta_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_features_items pages_blocks_features_items_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_features_items
    ADD CONSTRAINT pages_blocks_features_items_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages_blocks_features(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_features pages_blocks_features_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_features
    ADD CONSTRAINT pages_blocks_features_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_hero_buttons pages_blocks_hero_buttons_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_hero_buttons
    ADD CONSTRAINT pages_blocks_hero_buttons_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages_blocks_hero(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_hero pages_blocks_hero_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_hero
    ADD CONSTRAINT pages_blocks_hero_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_job_listings pages_blocks_job_listings_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_job_listings
    ADD CONSTRAINT pages_blocks_job_listings_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: pages_blocks_latest_posts pages_blocks_latest_posts_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_blocks_latest_posts
    ADD CONSTRAINT pages_blocks_latest_posts_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_applicants_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_applicants_fk FOREIGN KEY (applicants_id) REFERENCES public.applicants(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_applications_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_applications_fk FOREIGN KEY (applications_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_assessments_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_assessments_fk FOREIGN KEY (assessments_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_interview_slots_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_interview_slots_fk FOREIGN KEY (interview_slots_id) REFERENCES public.interview_slots(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_jobs_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_jobs_fk FOREIGN KEY (jobs_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_media_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_media_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_pages_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_pages_fk FOREIGN KEY (pages_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.payload_locked_documents(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_posts_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_posts_fk FOREIGN KEY (posts_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_proctoring_events_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_proctoring_events_fk FOREIGN KEY (proctoring_events_id) REFERENCES public.proctoring_events(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_proctoring_recordings_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_proctoring_recordings_fk FOREIGN KEY (proctoring_recordings_id) REFERENCES public.proctoring_recordings(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_proctoring_snapshots_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_proctoring_snapshots_fk FOREIGN KEY (proctoring_snapshots_id) REFERENCES public.proctoring_snapshots(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_resumes_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_resumes_fk FOREIGN KEY (resumes_id) REFERENCES public.resumes(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_users_fk FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payload_preferences_rels payload_preferences_rels_applicants_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_applicants_fk FOREIGN KEY (applicants_id) REFERENCES public.applicants(id) ON DELETE CASCADE;


--
-- Name: payload_preferences_rels payload_preferences_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.payload_preferences(id) ON DELETE CASCADE;


--
-- Name: payload_preferences_rels payload_preferences_rels_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_users_fk FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_cover_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_cover_image_id_media_id_fk FOREIGN KEY (cover_image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: proctoring_events proctoring_events_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_events
    ADD CONSTRAINT proctoring_events_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: proctoring_recordings proctoring_recordings_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_recordings
    ADD CONSTRAINT proctoring_recordings_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: proctoring_snapshots proctoring_snapshots_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proctoring_snapshots
    ADD CONSTRAINT proctoring_snapshots_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: site_settings site_settings_favicon_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_favicon_id_media_id_fk FOREIGN KEY (favicon_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: site_settings site_settings_logo_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_logo_id_media_id_fk FOREIGN KEY (logo_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: users_sessions users_sessions_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_sessions
    ADD CONSTRAINT users_sessions_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict OjHgG2SkMZvw4iTOk5kexsdqrmuahQt7KQqdsJ1V1IWDC6Q1K2wVPjdhdwij4CP

