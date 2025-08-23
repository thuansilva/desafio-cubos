drop schema if exists cubosmovie cascade;

create schema cubosmovie;

create table cubosmovie.movie (
    moviee_id uuid,
    movie_title text,
    movie_sinopse text,
    movie_popularity numeric,
    movie_date_lauch timestamptz,
    movie_duration numeric,
    movie_situation text,
    movie_language text,
    movie_genre text[],
    movie_budget numeric,
    movie_revenue numeric,
    movie_description text,
    movie_image_url text,
    movie_trailer_url text,
    movie_porcentage_like numeric,
    movie_created_at timestamptz default now(),
    movie_updated_at timestamptz default now(),
);

create table cubosmovie.user (
    user_id uuid,
    user_name text,
    user_email text,
    user_password text,
    user_created_at timestamptz default now(),
    user_updated_at timestamptz default now(),
);