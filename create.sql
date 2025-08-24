drop schema if exists cubosmovie cascade;

create schema cubosmovie;

create table cubosmovie.user (
    user_id uuid primary key,
    user_name text not null,
    user_email text unique not null,
    user_password text not null,
    user_created_at timestamptz default now(),
    user_updated_at timestamptz default now()
);

create table cubosmovie.movie (
    movie_id uuid primary key,
    user_id uuid not null,
    movie_title text not null,
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
    constraint fk_user
        foreign key (user_id)
        references cubosmovie.user(user_id)
        on delete cascade -- 🔥 se o usuário for deletado, deleta os filmes dele também
);